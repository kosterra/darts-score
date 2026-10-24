import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { preferenceOf } from '../rules/notifications.js';
import { RULES_GAMES } from './rules.kinds.js';
import { viewOf } from './game.view.js';
import { getBadge } from './badges.js';
import { getClubBadge, GOAL_METRICS } from './club.badges.js';
import { deliverQuietly, digestDue, languageOf, mailContact, sendDigests, unsubscribeToken } from './notify.js';
import { getAppUrl, isMailConfigured } from './mail.utils.js';
import { sendTemplateMail } from './mail.service.js';
import { tr, translate } from './translate.js';
import { lastWeeks, usageLines } from './usage.stats.js';
import { runTournamentJobs } from './tournaments.js';

/**
 * What the app does once an hour for the notifications: the mails of the
 * day and the week, the weekly summaries, the reminders (a game left
 * running, an invitation not used, a goal about to end, many errors), and
 * the tournaments (registrations that end, reminders, rounds behind).
 * Each reminder goes out once (see noticeSent).
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// true the first time a key is noted, so each reminder goes out once
const once = async (key) => {
    try {
        await db.noticeSent.create({ key });
        return true;
    } catch (err) {
        if (err?.code === 11000) return false;
        throw err;
    }
};

const day = (at) => {
    const date = new Date(at);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
};
const weekKey = (now) => {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
};

// the games of the app, with their name and the address of a running one
const GAMES = [
    { type: 'x01', model: () => db.x01, label: () => 'X01', live: (game) => `/x01/${game._id}` },
    { type: 'cricket', model: () => db.cricket, label: () => 'Cricket', live: (game) => `/cricket/${game._id}` },
    { type: 'elimination', model: () => db.elimination, label: () => 'Elimination', live: (game) => `/elimination/${game._id}` },
    { type: 'clock', model: () => db.clock, label: () => 'Around the Clock', live: (game) => `/clock/${game._id}` },
    { type: 'rules', model: () => db.rulesGame, label: (game) => RULES_GAMES[game.kind] ?? game.kind, live: (game) => `/play/${game.kind}/${game._id}` },
];

// the accounts of players, by player id
const accountsOf = async (playerIds) => {
    const players = await db.player.find({ _id: { $in: playerIds.filter(id => db.mongoose.isValidObjectId(id)) }, user: { $ne: null } }, 'user').lean();
    return players.map(player => player.user);
};

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export const RUNNING_DAYS = 3;
export const INVITE_DAYS = 7;
export const GOAL_DAYS = 7;
export const ERROR_SPIKE = 20;

/**
 * A game left running for RUNNING_DAYS days (and not older than a month):
 * its players with a login hear it, to finish or delete it.
 */
export const remindRunningGames = async (now = new Date()) => {
    for (const { model, label, live } of GAMES) {
        const games = await model().find({
            gameIsRunning: true,
            updatedAt: { $lt: new Date(now - RUNNING_DAYS * DAY), $gt: new Date(now - 30 * DAY) },
        }, 'players kind club createdAt updatedAt').lean();
        for (const game of games) {
            if (!(await once(`gameRunning:${game._id}`))) continue;
            const users = await accountsOf((game.players ?? []).map(String));
            await deliverQuietly(users.map(user => ({
                user,
                kind: 'gameRunning',
                title: `Your game of ${label(game)} from ${day(game.createdAt)} is still running`,
                body: 'Finish it, so it counts for your statistics and badges, or delete it.',
                link: live(game),
                club: game.club,
            })));
        }
    }
};

/**
 * An account invited by a club admin that never logged in after
 * INVITE_DAYS days: the club's admins hear it, to send the invitation again.
 */
export const remindUnusedInvites = async (now = new Date()) => {
    // invited: the "choose your password" link is still unused
    const users = await db.user.find({
        lastLoginAt: null,
        resetTokenHash: { $ne: null },
        role: ROLES.USER,
        createdAt: { $lt: new Date(now - INVITE_DAYS * DAY), $gt: new Date(now - 30 * DAY) },
    }, 'firstname lastname createdAt').lean();
    for (const user of users) {
        if (!(await once(`inviteUnused:${user._id}`))) continue;
        const name = `${user.firstname} ${user.lastname}`;
        const [players, clubs] = await Promise.all([
            db.player.find({ user: user._id }, 'nickname clubs').lean(),
            db.club.find({ admins: user._id }, 'name admins').lean(),
        ]);
        const notices = [];
        for (const player of players) {
            const playerClubs = await db.club.find({ _id: { $in: player.clubs } }, 'name admins').lean();
            for (const club of playerClubs) {
                for (const admin of club.admins ?? []) {
                    notices.push({
                        user: admin,
                        kind: 'inviteUnused',
                        title: `${name} has not logged in yet`,
                        body: `${player.nickname} got a login for ${club.name} ${INVITE_DAYS} days ago and has not used it. Send the invitation again from the player's page.`,
                        link: `/players/${player._id}`,
                        club: club._id,
                    });
                }
            }
        }
        for (const club of clubs) {
            for (const admin of (club.admins ?? []).filter(id => String(id) !== String(user._id))) {
                notices.push({
                    user: admin,
                    kind: 'inviteUnused',
                    title: `${name} has not logged in yet`,
                    body: `${name} was made an admin of ${club.name} ${INVITE_DAYS} days ago and has not logged in. Check the email address under Edit club.`,
                    link: `/my-clubs/${club._id}`,
                    club: club._id,
                });
            }
        }
        await deliverQuietly(notices);
    }
};

/**
 * A goal of a club ending within GOAL_DAYS days and not reached yet: its admins hear how far it is.
 */
export const remindEndingGoals = async (now = new Date()) => {
    const clubs = await db.club.find({ goals: { $elemMatch: { reachedAt: null, until: { $gt: now, $lt: new Date(now.getTime() + GOAL_DAYS * DAY) } } } }, 'name admins goals').lean();
    if (!clubs.length) return;
    const { syncClubBadges } = await import('./club.badge.service.js');
    for (const club of clubs) {
        const { progress } = await syncClubBadges(club._id, { notify: false });
        for (const goal of club.goals ?? []) {
            if (goal.reachedAt || !goal.until || new Date(goal.until) <= now || new Date(goal.until) > new Date(now.getTime() + GOAL_DAYS * DAY)) continue;
            if (!(await once(`goalEnding:${club._id}:${goal.id}`))) continue;
            const days = Math.max(1, Math.ceil((new Date(goal.until) - now) / DAY));
            await deliverQuietly((club.admins ?? []).map(admin => ({
                user: admin,
                kind: 'goalEnding',
                title: `The goal of ${club.name} ends in ${days} days: ${GOAL_METRICS[goal.metric]?.describe(goal.target) ?? goal.target}`,
                body: `It stands at ${Math.floor(progress[goal.id] ?? 0)} of ${goal.target}.`,
                link: '/badges#club',
                club: club._id,
            })));
        }
    }
};

/**
 * Many errors of the app within a day: the global admins hear it once a day.
 */
export const remindErrorSpike = async (now = new Date()) => {
    const count = await db.logEntry.countDocuments({ level: { $in: ['error', 'fatal'] }, time: { $gt: new Date(now - DAY) } });
    if (count < ERROR_SPIKE || !(await once(`errorSpike:${day(now)}`))) return;
    const admins = await db.user.find({ role: ROLES.GLOBAL_ADMIN, blockedAt: null }, '_id').lean();
    await deliverQuietly(admins.map(admin => ({
        user: admin._id,
        kind: 'errorSpike',
        title: `${count} errors in the last 24 hours`,
        body: 'See the error log for what went wrong.',
        link: '/admin/logs',
    })));
};

// ---------------------------------------------------------------------------
// Weekly summaries
// ---------------------------------------------------------------------------

const average = (values) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null);

/**
 * The week of a player (all their games and trainings in their clubs), as
 * lines in the language, or [] when they did not play.
 */
export const playerWeek = async (player, language, now = new Date()) => {
    const id = String(player._id);
    const since = new Date(now - 7 * DAY);
    let games = 0;
    let wins = 0;
    const x01Averages = [];
    for (const { type, model } of GAMES) {
        const finished = await model().find({ players: id, hasWinner: true, updatedAt: { $gt: since } }).lean();
        games += finished.length;
        wins += finished.filter(game => game.playerModels?.[id]?.hasWonGame === true).length;
        if (type === 'x01') {
            for (const game of finished) {
                const value = Number(viewOf('x01', game)?.playerModels?.[id]?.averages?.game?.overall ?? 0);
                if (value > 0) x01Averages.push(value);
            }
        }
    }
    const [atc, rules, bot] = await Promise.all([
        db.atc.countDocuments({ 'player.id': id, createdAt: { $gt: since } }),
        db.rulesTraining.countDocuments({ 'player.id': id, createdAt: { $gt: since } }),
        db.x01Training.countDocuments({ players: id, createdAt: { $gt: since } }),
    ]);
    const trainings = atc + rules + bot;
    const badges = (player.badges ?? []).filter(entry => new Date(entry.earnedAt) > since).map(entry => getBadge(entry.badge)?.title).filter(Boolean);
    if (!games && !trainings && !badges.length) return [];
    const lines = [];
    if (games) lines.push(tr(language, 'Games: {{games}}, won: {{wins}}', { games, wins }));
    const x01 = average(x01Averages);
    if (x01) lines.push(tr(language, 'X01 average: {{average}}', { average: x01 }));
    if (trainings) lines.push(tr(language, 'Trainings: {{count}}', { count: trainings }));
    if (badges.length) lines.push(tr(language, 'New badges: {{badges}}', { badges: badges.map(title => translate(language, title)).join(', ') }));
    return lines.map(line => `• ${line}`);
};

/**
 * The week of a club, as lines in the language, or [] when nothing happened.
 */
export const clubWeek = async (club, language, now = new Date()) => {
    const since = new Date(now - 7 * DAY);
    const [tallies, atc, rules, members, waiting, requests] = await Promise.all([
        db.clubTally.find({ club: club._id, at: { $gt: since } }, 'players num180s').lean(),
        db.atc.countDocuments({ club: club._id, createdAt: { $gt: since } }),
        db.rulesTraining.countDocuments({ club: club._id, createdAt: { $gt: since } }),
        db.player.countDocuments({ clubs: club._id, guest: { $ne: true }, createdAt: { $gt: since } }),
        db.fairPlayHit.countDocuments({ club: club._id, at: { $gt: since } }),
        db.joinRequest.countDocuments({ club: club._id, status: 'open' }),
    ]);
    const players = new Set(tallies.flatMap(tally => (tally.players ?? []).map(String))).size;
    const num180s = tallies.reduce((sum, tally) => sum + (tally.num180s ?? 0), 0);
    const badges = (club.badges ?? []).filter(entry => new Date(entry.earnedAt) > since).map(entry => getClubBadge(entry.badge)?.title).filter(Boolean);
    const lines = [];
    if (tallies.length) lines.push(tr(language, 'Games: {{games}}, players: {{players}}', { games: tallies.length, players }));
    if (num180s) lines.push(tr(language, '180s: {{count}}', { count: num180s }));
    if (atc + rules) lines.push(tr(language, 'Trainings: {{count}}', { count: atc + rules }));
    if (members) lines.push(tr(language, 'New members: {{count}}', { count: members }));
    if (badges.length) lines.push(tr(language, 'New club badges: {{badges}}', { badges: badges.map(title => translate(language, title)).join(', ') }));
    const open = (club.goals ?? []).filter(goal => !goal.reachedAt && (!goal.until || new Date(goal.until) > now));
    if (open.length) {
        const { syncClubBadges } = await import('./club.badge.service.js');
        const { progress } = await syncClubBadges(club._id, { notify: false });
        for (const goal of open) {
            lines.push(tr(language, 'Goal {{goal}}: {{progress}} of {{target}}', {
                goal: translate(language, GOAL_METRICS[goal.metric]?.describe(goal.target) ?? String(goal.target)),
                progress: Math.floor(progress[goal.id] ?? 0),
                target: goal.target,
            }));
        }
    }
    if (waiting) lines.push(tr(language, 'New under Fair play: {{count}}', { count: waiting }));
    if (requests) lines.push(tr(language, 'Open requests to join: {{count}}', { count: requests }));
    if (!tallies.length && !(atc + rules) && !members && !badges.length && !waiting) return [];
    return lines.map(line => `• ${line}`);
};

const manageUrl = () => `${getAppUrl()}/profile#notifications`;
const headersOf = (token) => ({
    'List-Unsubscribe': `<${getAppUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});

/**
 * The weekly summaries that are due (Mondays, from the hour of the mails on):
 * of each player who chose it, of each club for the admins who chose it, and
 * of each player without a login whose club mails it to them.
 */
export const sendWeeklySummaries = async (now = new Date()) => {
    if (!isMailConfigured() || !digestDue('weekly', null, now) || now.getDay() !== 1) return 0;
    const week = weekKey(now);
    let sent = 0;
    const users = await db.user.find({ blockedAt: null, notifications: { $exists: true } }, 'email firstname language notifications role').lean();
    for (const user of users) {
        const language = languageOf(user);
        const token = unsubscribeToken('user', user._id, 'all');
        try {
            if (user.role !== ROLES.GLOBAL_ADMIN && preferenceOf(user.notifications, 'weeklySummary').mail === 'weekly' && await once(`weeklySummary:${user._id}:${week}`)) {
                const players = await db.player.find({ user: user._id, guest: { $ne: true } }, 'badges').lean();
                const lines = (await Promise.all(players.map(player => playerWeek(player, language, now)))).flat();
                if (lines.length) {
                    await sendTemplateMail('weeklySummary', user.email, { firstname: user.firstname, summary: lines.join('\n'), link: `${getAppUrl()}/me`, manageUrl: manageUrl() }, language, { headers: headersOf(token) });
                    sent += 1;
                }
            }
            if (preferenceOf(user.notifications, 'clubSummary').mail === 'weekly') {
                const clubs = await db.club.find({ admins: user._id }, 'name badges goals').lean();
                for (const club of clubs) {
                    if (!(await once(`clubSummary:${user._id}:${club._id}:${week}`))) continue;
                    const lines = await clubWeek(club, language, now);
                    if (!lines.length) continue;
                    await sendTemplateMail('clubSummary', user.email, { firstname: user.firstname, club: club.name, summary: lines.join('\n'), link: `${getAppUrl()}/club`, manageUrl: manageUrl() }, language, { headers: headersOf(token) });
                    sent += 1;
                }
            }
        } catch (err) {
            logger.error(err, `Failed to send the weekly summary to ${user.email}`);
        }
    }
    sent += await sendUsageReports(now);
    const contacts = await db.playerContact.find({ topics: 'weeklySummary', unsubscribedAt: null }).lean();
    for (const contact of contacts) {
        try {
            if (!(await once(`contactSummary:${contact._id}:${week}`))) continue;
            const player = await db.player.findById(contact.player, 'badges user').lean();
            if (!player || player.user) continue;
            const lines = await playerWeek(player, contact.language ?? 'en', now);
            if (!lines.length) continue;
            await mailContact(contact, { title: 'Your week on the oche', details: lines.join('\n') });
            sent += 1;
        } catch (err) {
            logger.error(err, `Failed to send the weekly summary of player ${contact.player}`);
        }
    }
    return sent;
};

/**
 * The use of the app in the week that ended, for every global admin who
 * keeps the report on (it is on by default), in their language.
 */
export const sendUsageReports = async (now = new Date()) => {
    const admins = await db.user.find({ role: ROLES.GLOBAL_ADMIN, blockedAt: null }, 'email firstname language notifications').lean();
    const due = [];
    for (const admin of admins) {
        if (preferenceOf(admin.notifications, 'usageReport').mail !== 'weekly') continue;
        if (await once(`usageReport:${admin._id}:${weekKey(now)}`)) due.push(admin);
    }
    if (!due.length) return 0;
    const { week, before } = await lastWeeks(now);
    const range = `${day(week.start)} – ${day(new Date(week.end - DAY))}`;
    let sent = 0;
    for (const admin of due) {
        const language = languageOf(admin);
        try {
            await sendTemplateMail('usageReport', admin.email, {
                firstname: admin.firstname, week: range, summary: usageLines(week, before, language).join('\n'),
                link: `${getAppUrl()}/admin/usage`, manageUrl: manageUrl(),
            }, language, { headers: headersOf(unsubscribeToken('user', admin._id, 'usageReport')) });
            sent += 1;
        } catch (err) {
            logger.error(err, `Failed to send the usage report to ${admin.email}`);
        }
    }
    return sent;
};

// ---------------------------------------------------------------------------
// Once an hour
// ---------------------------------------------------------------------------

export const runNotificationJobs = async (now = new Date()) => {
    for (const [name, job] of Object.entries({
        remindRunningGames, remindUnusedInvites, remindEndingGoals, remindErrorSpike,
        sendDigests, sendWeeklySummaries, runTournamentJobs,
    })) {
        try {
            await job(now);
        } catch (err) {
            logger.error(err, `The notification job ${name} failed`);
        }
    }
};

export const startNotificationJobs = () => {
    // a little after the start, then every hour
    setTimeout(() => runNotificationJobs(), 60 * 1000).unref();
    setInterval(() => runNotificationJobs(), HOUR).unref();
};
