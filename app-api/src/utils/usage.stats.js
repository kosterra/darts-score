import db from '../models/db.model.js';
import { tr } from './translate.js';

/**
 * The use of the app per week (Monday to Sunday, in the time zone of the
 * server), for the global admins and their mail on Mondays: who used it and
 * how often they logged in (counted since the installation keeps it), and
 * what was played and set up (from the games, trainings, accounts and clubs).
 */

// the Monday the week of a moment starts with, weeksBack weeks earlier
export const weekStart = (at = new Date(), weeksBack = 0) => {
    const date = new Date(at);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7) - 7 * weeksBack);
};
const nextWeek = (start) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);

const GAMES = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
    more: () => db.rulesGame,
};

const between = (start, end) => ({ $gte: start, $lt: end });

/**
 * The figures of one week: { start, end, tracked, activeUsers, logins,
 * busiestDay: { day, users }, newUsers, newClubs, newPlayers, activeClubs,
 * games: { total, x01, … }, finishedGames, num180s, trainings, quickGames }.
 * tracked: whether the use of the app was counted the whole week.
 */
export const usageOfWeek = async (start, end = nextWeek(start)) => {
    const range = between(start, end);
    const [days, firstDay, newUsers, newClubs, newPlayers, tallies, atc, rules, bot, quickGames, ...games] = await Promise.all([
        db.usageDay.find({ at: range }).lean(),
        db.usageDay.findOne({}, 'at').sort({ at: 1 }).lean(),
        db.user.countDocuments({ createdAt: range }),
        db.club.countDocuments({ createdAt: range }),
        db.player.countDocuments({ createdAt: range, guest: { $ne: true } }),
        db.clubTally.find({ at: range }, 'club num180s').lean(),
        db.atc.countDocuments({ createdAt: range }),
        db.rulesTraining.countDocuments({ createdAt: range }),
        db.x01Training.countDocuments({ createdAt: range }),
        db.quickGame.countDocuments({ createdAt: range }),
        ...Object.values(GAMES).map(model => model().countDocuments({ createdAt: range })),
    ]);
    const perGame = Object.fromEntries(Object.keys(GAMES).map((key, index) => [key, games[index]]));
    const busiest = days.reduce((best, entry) => ((entry.users?.length ?? 0) > (best?.users ?? 0) ? { day: entry.at, users: entry.users.length } : best), null);
    return {
        start, end,
        tracked: Boolean(firstDay && new Date(firstDay.at) <= start),
        activeUsers: new Set(days.flatMap(entry => (entry.users ?? []).map(String))).size,
        logins: days.reduce((sum, entry) => sum + (entry.logins ?? 0), 0),
        busiestDay: busiest,
        newUsers, newClubs, newPlayers,
        activeClubs: new Set(tallies.map(tally => String(tally.club))).size,
        games: { total: games.reduce((sum, count) => sum + count, 0), ...perGame },
        finishedGames: tallies.length,
        num180s: tallies.reduce((sum, tally) => sum + (tally.num180s ?? 0), 0),
        trainings: atc + rules + bot,
        quickGames,
        mails: days.reduce((sum, entry) => sum + (entry.mails ?? 0), 0),
        mailsHeldBack: days.reduce((sum, entry) => sum + (entry.mailsHeldBack ?? 0), 0),
        mailLimitDays: days.filter(entry => entry.mailLimitReachedAt).length,
    };
};

/**
 * The last weeks, the current one (so far) first: { since, weeks }.
 * since: from when the use of the app is counted, or null.
 */
export const weeklyUsage = async (count = 12, now = new Date()) => {
    const weeks = [];
    for (let back = 0; back < count; back += 1) {
        const start = weekStart(now, back);
        weeks.push({ ...(await usageOfWeek(start)), current: back === 0 });
    }
    const first = await db.usageDay.findOne({}, 'at').sort({ at: 1 }).lean();
    return { since: first?.at ?? null, weeks };
};

const change = (now, before) => {
    if (!before) return now ? ` (+${now})` : '';
    const percent = Math.round(((now - before) / before) * 100);
    return percent === 0 ? ' (±0 %)' : ` (${percent > 0 ? '+' : ''}${percent} %)`;
};

/**
 * The week that ended as lines of the mail, in a language, each with the
 * change against the week before: "• Active users: 42 (+12 %)".
 */
export const usageLines = (week, before, language = 'en') => {
    const line = (text, value, previous) => `• ${tr(language, text, { count: value })}${change(value, previous)}`;
    const lines = [];
    if (week.tracked || week.activeUsers) {
        lines.push(line('Active users: {{count}}', week.activeUsers, before?.activeUsers));
        lines.push(line('Logins: {{count}}', week.logins, before?.logins));
    }
    lines.push(line('Games started: {{count}}', week.games.total, before?.games.total));
    lines.push(line('Games finished in clubs: {{count}}', week.finishedGames, before?.finishedGames));
    lines.push(line('Clubs that played: {{count}}', week.activeClubs, before?.activeClubs));
    lines.push(line('Trainings: {{count}}', week.trainings, before?.trainings));
    lines.push(line('Quick games: {{count}}', week.quickGames, before?.quickGames));
    lines.push(line('New accounts: {{count}}', week.newUsers, before?.newUsers));
    lines.push(line('New clubs: {{count}}', week.newClubs, before?.newClubs));
    lines.push(line('New players: {{count}}', week.newPlayers, before?.newPlayers));
    if (week.num180s) lines.push(line('180s: {{count}}', week.num180s, before?.num180s));
    if (week.mails || before?.mails) lines.push(line('Mails sent: {{count}}', week.mails, before?.mails));
    if (week.mailLimitDays) {
        lines.push(`• ${tr(language, 'Daily mail limit reached on {{count}} of 7 days, {{held}} mails not sent', { count: week.mailLimitDays, held: week.mailsHeldBack })}`);
    }
    return lines;
};

// the week that ended last Sunday, and the one before it
export const lastWeeks = async (now = new Date()) => {
    const start = weekStart(now, 1);
    const [week, before] = await Promise.all([usageOfWeek(start), usageOfWeek(weekStart(now, 2))]);
    return { week, before };
};
