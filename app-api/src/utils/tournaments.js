import { createHmac, timingSafeEqual } from 'node:crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { preferenceOf } from '../rules/notifications.js';
import {
    MIN_PLAYERS, MAX_PLAYERS_CHOICES, SEEDINGS, advance, bracketMatches, cleanRules, drawBracket, isDecided,
    presetById, retract, roundSizes, rulesError,
} from '../rules/tournaments.js';
import { getSessionSecret } from './auth.utils.js';
import { storedOf } from './game.view.js';
import { clubRatings } from './compare.js';
import { getAppUrl, isMailConfigured } from './mail.utils.js';
import { sendTemplateMail } from './mail.service.js';
import { dateIn, deliverQuietly, languageOf, unsubscribeToken } from './notify.js';
import { tr } from './translate.js';

/**
 * The tournaments of a club (knockout, see rules/tournaments.js): the
 * registration with its invitations, the draw, the matches as X01 games and
 * the winners moving on until the final. The rules of the bracket are shared
 * with the app; what happens around them is here.
 */

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 1000;
// how long before the end of the registration the members who did not answer are reminded
export const REMINDER_HOURS = 24;

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

// the name of a round by how many players are left in it, in English (translated on screen and in mails)
export const roundName = (size) => ({ 2: 'Final', 4: 'Semi-finals', 8: 'Quarter-finals' })[size] ?? `Last ${size}`;

// the rules of a round in words of a language: "Best of 5 legs", "First to 3 sets (Best of 5 legs)"
export const rulesText = (rules, language = 'en') => {
    const legs = tr(language, rules.legMode === 'First to' ? 'First to {{count}} legs' : 'Best of {{count}} legs', { count: rules.numberOfLegs });
    const text = rules.numberOfSets > 1
        ? `${tr(language, rules.setMode === 'First to' ? 'First to {{count}} sets' : 'Best of {{count}} sets', { count: rules.numberOfSets })} (${legs})`
        : legs;
    const special = rules.startingScore !== 501 || rules.legInMode !== 'Straight In' || rules.legOutMode !== 'Double Out';
    return special ? `${rules.startingScore} ${tr(language, rules.legInMode)} / ${tr(language, rules.legOutMode)}, ${text}` : text;
};

// the rounds of a tournament as lines of a mail, the first round first
const scheduleOf = (tournament, language) => tournament.rounds
    .filter(round => !round.skipped)
    .map(round => `• ${tr(language, roundName(round.size))}: ${round.date ? dateIn(language, round.date) : '–'}, ${rulesText(round.rules, language)}`)
    .join('\n');

// ---------------------------------------------------------------------------
// The links of the invitations: entering or declining with one click
// ---------------------------------------------------------------------------

const sign = (payload) => createHmac('sha256', `tournament:${getSessionSecret()}`).update(payload).digest('base64url');

export const replyToken = (tournamentId, playerId) => {
    const payload = Buffer.from(JSON.stringify([String(tournamentId), String(playerId)])).toString('base64url');
    return `${payload}.${sign(payload)}`;
};

// → { tournament, player } (ids) or null when the token is not one of ours
export const readReplyToken = (token) => {
    const [payload, signature] = String(token ?? '').split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
        const [tournament, player] = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!db.mongoose.isValidObjectId(tournament) || !db.mongoose.isValidObjectId(player)) return null;
        return { tournament, player };
    } catch {
        return null;
    }
};

const replyLink = (tournament, playerId, answer) => `${getAppUrl()}/tournament-reply?token=${encodeURIComponent(replyToken(tournament._id, playerId))}&answer=${answer}`;

// ---------------------------------------------------------------------------
// Who may play
// ---------------------------------------------------------------------------

// the members of a club who can enter: its players, without guests and anonymised ones
export const eligibleMembers = (clubId) => db.player.find({ clubs: clubId, guest: { $ne: true }, anonymizedAt: null }, 'nickname firstname lastname user').lean();

export const countEligible = (clubId) => db.player.countDocuments({ clubs: clubId, guest: { $ne: true }, anonymizedAt: null });

export const entriesIn = (tournament) => (tournament.entries ?? []).filter(entry => entry.status === 'in');

// ---------------------------------------------------------------------------
// Setting up
// ---------------------------------------------------------------------------

const dayOf = (date) => {
    const at = new Date(date);
    return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
};

/**
 * What an admin sent to set up a tournament, checked: { setup } or { error }.
 * stored: the tournament as it is (null for a new one); what may change
 * depends on how far it is (the rules and days of rounds already played stay).
 */
export const checkSetup = (body, stored = null) => {
    const status = stored?.status ?? 'draft';
    const early = ['draft', 'registration'].includes(status);
    const name = String(body.name ?? stored?.name ?? '').trim();
    if (!name) return { error: 'Give the tournament a name.' };
    if (name.length > NAME_MAX) return { error: `The name is at most ${NAME_MAX} characters.` };
    const description = String(body.description ?? stored?.description ?? '').trim();
    if (description.length > DESCRIPTION_MAX) return { error: `The description is at most ${DESCRIPTION_MAX} characters.` };
    const maxPlayers = early ? Number(body.maxPlayers ?? stored?.maxPlayers ?? 16) : stored.maxPlayers;
    if (!MAX_PLAYERS_CHOICES.includes(maxPlayers)) return { error: 'Choose how many players can play at most.' };
    const closesAt = early && body.closesAt ? new Date(body.closesAt) : new Date(stored?.closesAt ?? body.closesAt);
    if (Number.isNaN(closesAt.getTime())) return { error: 'Choose until when the members can enter.' };

    const sizes = roundSizes(maxPlayers);
    const sent = Array.isArray(body.rounds) ? body.rounds : stored?.rounds ?? [];
    const rounds = [];
    for (const size of sizes) {
        const given = sent.find(round => Number(round?.size) === size);
        const before = stored?.rounds?.find(round => round.size === size);
        // a round with a match started or decided keeps its rules and day
        const played = stored?.matches?.some(match => match.size === size && (match.status === 'running' || (isDecided(match) && !match.bye)));
        if (played) {
            rounds.push({ size, date: before.date, rules: before.rules, skipped: before.skipped ?? false });
            continue;
        }
        if (!given) return { error: 'Every round needs its rules.' };
        const problem = rulesError(given.rules);
        if (problem) return { error: problem };
        const date = given.date ? new Date(given.date) : null;
        if (date && Number.isNaN(date.getTime())) return { error: 'A day of a round is not a date.' };
        rounds.push({ size, date, rules: cleanRules(given.rules), skipped: before?.skipped ?? false });
    }
    const preset = body.preset === undefined ? stored?.preset ?? null : presetById(body.preset)?.id ?? null;
    return { setup: { name, description, maxPlayers, closesAt, rounds, preset } };
};

/**
 * Why the registration cannot open (or the dates not stay as they are once
 * it is open), or null: every round on a day of its own, one after the
 * other, after the registration; the registration still to end.
 */
export const scheduleError = ({ closesAt, rounds }, now = new Date()) => {
    if (new Date(closesAt) <= now) return 'The registration has to end in the future.';
    const playing = rounds.filter(round => !round.skipped);
    if (playing.some(round => !round.date)) return 'Choose the day of every round.';
    let previous = dayOf(closesAt) - 1;
    for (const round of playing) {
        const day = dayOf(round.date);
        if (day < dayOf(closesAt)) return 'The rounds are played after the registration ends.';
        if (day <= previous) return 'Every round is played on a day of its own, one after the other.';
        previous = day;
    }
    return null;
};

// ---------------------------------------------------------------------------
// Telling people
// ---------------------------------------------------------------------------

const adminsOf = async (clubId) => (await db.club.findById(clubId, 'admins name').lean()) ?? { admins: [], name: '' };

// the accounts of players, by player id
const accountsOf = async (playerIds) => {
    const players = await db.player.find({ _id: { $in: playerIds.filter(Boolean) } }, 'user nickname').lean();
    return new Map(players.map(player => [String(player._id), player]));
};

// notifications to the players (with a login) of a tournament
const tellPlayers = async (tournament, playerIds, notice) => {
    const players = await accountsOf(playerIds);
    await deliverQuietly([...players.values()].filter(player => player.user).map(player => ({
        user: player.user, club: tournament.club, link: `/tournaments/${tournament._id}`, ...(typeof notice === 'function' ? notice(player) : notice),
    })));
};

const tellAdmins = async (tournament, notice) => {
    const club = await adminsOf(tournament.club);
    await deliverQuietly((club.admins ?? []).map(admin => ({ user: admin, club: tournament.club, link: `/tournaments/${tournament._id}`, ...notice })));
};

/**
 * Invites (or reminds) entries: an account in the app and by the mail with
 * the links to enter or decline, as it chose; a player without a login by
 * that mail when their club keeps an address for it with this topic.
 * kind: 'invite' or 'reminder'. Resolves to how many were told.
 */
export const invite = async (tournament, entries, kind = 'invite') => {
    if (!entries.length) return 0;
    const club = await db.club.findById(tournament.club, 'name').lean();
    const players = await db.player.find({ _id: { $in: entries.map(entry => entry.player) } }, 'nickname firstname user').lean();
    const users = new Map((await db.user.find({ _id: { $in: players.map(player => player.user).filter(Boolean) }, blockedAt: null }, 'email firstname language notifications').lean())
        .map(user => [String(user._id), user]));
    const contacts = new Map((await db.playerContact.find({ player: { $in: players.filter(player => !player.user).map(player => player._id) }, unsubscribedAt: null, topics: 'tournamentInvites' }).lean())
        .map(contact => [String(contact.player), contact]));
    const template = kind === 'reminder' ? 'tournamentReminder' : 'tournamentInvite';
    const notice = kind === 'reminder'
        ? { kind: 'tournamentReminder', title: `Last day to enter ${tournament.name}`, body: 'The registration ends tomorrow. Enter or decline on the tournament page.' }
        : { kind: 'tournamentInvite', title: `You are invited to ${tournament.name}`, body: 'Enter or decline on the tournament page before the registration ends.' };
    let told = 0;
    for (const player of players) {
        const vars = (language) => ({
            club: club?.name ?? '', tournament: tournament.name, closes: dateIn(language, tournament.closesAt),
            schedule: scheduleOf(tournament, language), link: replyLink(tournament, player._id, 'in'), declineLink: replyLink(tournament, player._id, 'out'),
        });
        try {
            const user = player.user ? users.get(String(player.user)) : null;
            if (user) {
                const preference = preferenceOf(user.notifications, 'tournamentInvites');
                if (preference.inApp) await db.notification.create({ user: user._id, club: tournament.club, link: `/tournaments/${tournament._id}`, ...notice, inApp: true, mail: 'off' });
                if (preference.mail !== 'off' && isMailConfigured()) {
                    const language = languageOf(user);
                    await sendTemplateMail(template, user.email, { firstname: user.firstname, ...vars(language), manageUrl: `${getAppUrl()}/profile#notifications` }, language);
                }
                told += 1;
            } else if (contacts.has(String(player._id)) && isMailConfigured()) {
                const contact = contacts.get(String(player._id));
                const language = contact.language ?? 'en';
                const token = unsubscribeToken('contact', contact._id, 'tournamentInvites');
                await sendTemplateMail(template, contact.email, { firstname: player.firstname, ...vars(language), unsubscribeUrl: `${getAppUrl()}/unsubscribe?token=${encodeURIComponent(token)}` }, language);
                told += 1;
            }
        } catch (err) {
            logger.warn(`Could not invite ${player.nickname} to the tournament ${tournament._id}: ${err.message}`);
        }
    }
    return told;
};

// ---------------------------------------------------------------------------
// The registration
// ---------------------------------------------------------------------------

/**
 * Opens the registration: every member who can play is invited.
 */
export const openRegistration = async (tournament) => {
    const members = await eligibleMembers(tournament.club);
    const known = new Map((tournament.entries ?? []).map(entry => [String(entry.player), entry]));
    tournament.entries = members.map(member => known.get(String(member._id)) ?? { player: member._id, club: tournament.club, status: 'invited' });
    tournament.status = 'registration';
    await tournament.save();
    const told = await invite(tournament, tournament.entries.filter(entry => entry.status === 'invited'));
    logger.info(`Registration of the tournament ${tournament._id} opened, ${told} members invited`);
    return told;
};

/**
 * An answer to the invitation ('in' or 'out'), by the player or by an
 * admin for them (who may also add a member not asked yet). Throws an
 * Error with a status when it cannot be taken.
 */
export const answerEntry = async (tournament, playerId, status, { byAdmin = false } = {}) => {
    const open = tournament.status === 'registration' || (byAdmin && tournament.status === 'closed');
    if (!open) throw Object.assign(new Error('The registration is closed.'), { status: 409 });
    if (!['in', 'out'].includes(status)) throw Object.assign(new Error('Answer in or out.'), { status: 422 });
    const id = String(playerId);
    let entry = tournament.entries.find(item => String(item.player) === id);
    if (!entry) {
        // an admin adds a member who was not asked (joined later)
        const member = byAdmin && await db.player.exists({ _id: id, clubs: tournament.club, guest: { $ne: true } });
        if (!member) throw Object.assign(new Error('This player is not a member of the club.'), { status: 404 });
        tournament.entries.push({ player: id, club: tournament.club, status: 'invited' });
        entry = tournament.entries[tournament.entries.length - 1];
    }
    if (status === 'in' && entry.status !== 'in' && entriesIn(tournament).length >= tournament.maxPlayers) {
        throw Object.assign(new Error(`The tournament is full: ${tournament.maxPlayers} players.`), { status: 409 });
    }
    entry.status = status;
    entry.answeredAt = new Date();
    entry.byAdmin = byAdmin;
    await tournament.save();
    return entry;
};

/**
 * Closes the registration (at its end, or earlier by an admin): the admins
 * hear how many entered, and to hold the draw or what to do with too few.
 */
export const closeRegistration = async (tournament) => {
    tournament.status = 'closed';
    await tournament.save();
    const count = entriesIn(tournament).length;
    await tellAdmins(tournament, count >= MIN_PLAYERS
        ? { kind: 'tournamentClosed', title: `Registration of ${tournament.name} closed: ${count} players`, body: 'Hold the draw on the tournament page.' }
        : { kind: 'tournamentClosed', title: `Too few players for ${tournament.name}: ${count} of ${MIN_PLAYERS}`, body: 'Extend the registration or cancel the tournament.' });
    return count;
};

// ---------------------------------------------------------------------------
// The draw
// ---------------------------------------------------------------------------

/**
 * Holds the draw: the bracket from the players who entered, seeded by the
 * club rating (the best quarter placed apart) or at random; byes to the
 * first seeds. Rounds the field is too small for are left out. The players
 * hear their first match.
 */
export const holdDraw = async (tournament, { seeding = 'seeded', by = null, random = Math.random } = {}) => {
    if (tournament.status !== 'closed') throw Object.assign(new Error('Close the registration first.'), { status: 409 });
    if (!SEEDINGS.includes(seeding)) throw Object.assign(new Error('Choose how the draw is held.'), { status: 422 });
    const players = entriesIn(tournament).map(entry => String(entry.player));
    if (players.length < MIN_PLAYERS) throw Object.assign(new Error(`A tournament needs at least ${MIN_PLAYERS} players.`), { status: 409 });
    // the strongest first by the club rating; players without games in random order behind them
    const ratings = clubRatings(await db.clubTally.find({ club: tournament.club }, 'at players winners friendly').lean());
    const tiebreak = new Map(players.map(id => [id, random()]));
    const ranked = [...players].sort((a, b) => (ratings.get(b)?.rating ?? 0) - (ratings.get(a)?.rating ?? 0) || tiebreak.get(a) - tiebreak.get(b));
    const draw = drawBracket(ranked, { seeding, random });
    const matches = bracketMatches(draw);
    const seeds = seeding === 'seeded' ? new Map(ranked.slice(0, Math.max(2, draw.size / 4)).map((id, index) => [id, index + 1])) : new Map();
    tournament.entries = tournament.entries.map(entry => ({ ...(entry.toObject?.() ?? entry), seed: seeds.get(String(entry.player)) ?? null }));
    tournament.matches = matches.map(match => ({ ...match, players: [...match.players] }));
    tournament.rounds = tournament.rounds.map(round => ({ ...(round.toObject?.() ?? round), skipped: round.size > draw.size }));
    tournament.draw = { at: new Date(), by, seeding, size: draw.size };
    tournament.status = 'drawn';
    await tournament.save();
    logger.info(`Draw of the tournament ${tournament._id}: ${players.length} players, bracket of ${draw.size}, ${seeding}`);

    // each player hears their first match (or their bye)
    const names = await accountsOf(players);
    const firstOf = (playerId) => matches.find(match => match.players.includes(playerId) && match.size === draw.size);
    await tellPlayers(tournament, players, (player) => {
        const match = firstOf(String(player._id));
        const other = match?.players.find(id => id && id !== String(player._id));
        return {
            kind: 'tournamentDrawn',
            title: `The draw of ${tournament.name} is done`,
            body: match?.bye ? 'You have a bye into the next round.' : `Your first match: against ${names.get(other)?.nickname ?? '?'}`,
        };
    });
    return tournament;
};

// ---------------------------------------------------------------------------
// The matches
// ---------------------------------------------------------------------------

const roundOf = (tournament, size) => tournament.rounds.find(round => round.size === size);
const plainMatches = (tournament) => tournament.matches.map(match => (typeof match.toObject === 'function' ? match.toObject() : { ...match })).map(match => ({ ...match, players: [...match.players] }));

/**
 * Starts a match as an X01 game with the rules of its round, the given
 * player throwing first. A match already running answers with its game.
 * → the game
 */
export const startMatch = async (tournament, matchKey, { first = null } = {}) => {
    if (!['drawn', 'running'].includes(tournament.status)) throw Object.assign(new Error('The tournament is not running.'), { status: 409 });
    const matches = plainMatches(tournament);
    const match = matches.find(entry => entry.id === matchKey);
    if (!match) throw Object.assign(new Error('There is no such match.'), { status: 404 });
    if (match.status === 'running' && match.game) {
        const running = await db.x01.findById(match.game);
        if (running) return running;
    }
    if (match.status !== 'ready') throw Object.assign(new Error(isDecided(match) ? 'This match is decided.' : 'The players of this match are not known yet.'), { status: 409 });
    const [a, b] = match.players;
    const players = first === b ? [b, a] : [a, b];
    const { rules } = roundOf(tournament, match.size);
    const stored = storedOf('x01', {
        ...cleanRules(rules),
        isSoloGame: false,
        players,
        currentPlayerTurn: players[0],
        startingPlayerSet: players[0],
        startingPlayerLeg: players[0],
        visits: [],
    });
    const game = await db.x01.create({ ...stored, club: tournament.club, friendly: false, tournament: { id: tournament._id, match: match.id } });
    match.status = 'running';
    match.game = game._id;
    tournament.matches = matches;
    tournament.status = 'running';
    await tournament.save();
    return game;
};

// what a decided game shows in the bracket: sets (when played in sets) and legs, in the order of the match's players
const scoreOf = (view, match, rules) => {
    const models = view?.playerModels ?? {};
    const score = { legs: match.players.map(id => models[id]?.legsWon?.game ?? 0) };
    if (rules.numberOfSets > 1) score.sets = match.players.map(id => models[id]?.setsWon ?? 0);
    return score;
};

/**
 * Decides a match and moves its winner on: the next match is ready once both
 * players are known (they hear it), and the final decides the tournament.
 */
const decide = async (tournament, matches, match, winner, extra = {}) => {
    const byId = new Map(matches.map(entry => [entry.id, entry]));
    Object.assign(match, { winner, decidedAt: new Date(), ...extra });
    const next = advance(byId, match);
    tournament.matches = matches;
    if (!next) {
        tournament.status = 'finished';
        tournament.winner = winner;
        tournament.finishedAt = new Date();
    }
    await tournament.save();
    if (next?.status === 'ready') {
        const names = await accountsOf(next.players);
        await tellPlayers(tournament, next.players, (player) => ({
            kind: 'tournamentMatch',
            title: `Your next match in ${tournament.name}: against ${names.get(next.players.find(id => id !== String(player._id)))?.nickname ?? '?'}`,
            body: roundName(next.size),
        }));
    }
    if (!next) await finished(tournament);
};

// the end of a tournament: everyone who played hears who won, the winner and the runner-up get their badges
const finished = async (tournament) => {
    const players = entriesIn(tournament).map(entry => String(entry.player));
    const names = await accountsOf([tournament.winner]);
    await tellPlayers(tournament, players, { kind: 'tournamentWon', title: `${names.get(tournament.winner)?.nickname ?? '?'} wins ${tournament.name}` });
    logger.info(`Tournament ${tournament._id} won by ${tournament.winner}`);
    const final = tournament.matches.find(match => match.size === 2);
    const { syncPlayerBadges } = await import('./badge.service.js');
    for (const id of final?.players ?? []) {
        const player = id && await db.player.findById(id);
        if (player) await syncPlayerBadges(player, { notify: true }).catch(err => logger.warn(`Could not update the badges of ${id}: ${err.message}`));
    }
};

/**
 * A tournament game is over: its match is decided by it.
 * view: the game with its results worked out (answerOf).
 */
export const tournamentGameFinished = async (game, view) => {
    try {
        const tournament = await db.tournament.findById(game.tournament.id);
        if (!tournament || !['drawn', 'running'].includes(tournament.status)) return;
        const matches = plainMatches(tournament);
        const match = matches.find(entry => entry.id === game.tournament.match);
        if (!match || isDecided(match) || String(match.game) !== String(game._id)) return;
        const winner = match.players.find(id => view?.playerModels?.[id]?.hasWonGame);
        if (!winner) return;
        await decide(tournament, matches, match, winner, { status: 'done', score: scoreOf(view, match, roundOf(tournament, match.size).rules) });
    } catch (err) {
        logger.error(err, `Failed to move on the winner of the tournament game ${game._id}`);
    }
};

/**
 * A tournament game was deleted: a running match can be started again; a
 * decided one keeps its result (the bracket has moved on), without the game.
 */
export const tournamentGameDeleted = async (game) => {
    try {
        const tournament = await db.tournament.findById(game.tournament.id);
        if (!tournament) return;
        const matches = plainMatches(tournament);
        const match = matches.find(entry => entry.id === game.tournament.match && String(entry.game) === String(game._id));
        if (!match) return;
        if (match.status === 'running') match.status = 'ready';
        match.game = null;
        tournament.matches = matches;
        await tournament.save();
    } catch (err) {
        logger.error(err, `Failed to take the deleted game ${game._id} out of its tournament`);
    }
};

/**
 * An admin decides a match without (or instead of) a game: a walkover, or a
 * result agreed elsewhere. A match already decided can be changed as long as
 * the next one has not started.
 */
export const setResult = async (tournament, matchKey, winner, { by = null } = {}) => {
    if (!['drawn', 'running'].includes(tournament.status)) throw Object.assign(new Error('The tournament is not running.'), { status: 409 });
    const matches = plainMatches(tournament);
    const byId = new Map(matches.map(entry => [entry.id, entry]));
    const match = byId.get(matchKey);
    if (!match || match.bye) throw Object.assign(new Error('There is no such match.'), { status: 404 });
    if (!match.players.includes(String(winner))) throw Object.assign(new Error('The winner has to be a player of the match.'), { status: 422 });
    if (!match.players[0] || !match.players[1]) throw Object.assign(new Error('The players of this match are not known yet.'), { status: 409 });
    if (isDecided(match) && !retract(byId, match)) throw Object.assign(new Error('The next match has started: this result stays.'), { status: 409 });
    if (match.status === 'running' && match.game) {
        // the game that was started is no longer the one that decides it
        await db.x01.updateOne({ _id: match.game }, { $unset: { tournament: '' } });
        match.game = null;
    }
    if (tournament.status === 'drawn') tournament.status = 'running';
    await decide(tournament, matches, match, String(winner), { status: 'walkover', score: null, decidedBy: by });
    return tournament;
};

/**
 * Cancels a tournament: whoever was invited or entered hears it.
 */
export const cancelTournament = async (tournament) => {
    const told = tournament.status !== 'draft';
    tournament.status = 'cancelled';
    await tournament.save();
    if (told) {
        await tellPlayers(tournament, tournament.entries.filter(entry => entry.status !== 'out').map(entry => String(entry.player)), {
            kind: 'tournamentCancelled', title: `${tournament.name} is cancelled`,
        });
    }
};

// ---------------------------------------------------------------------------
// For the app
// ---------------------------------------------------------------------------

/**
 * A tournament as the app shows it: with the names of its players, the
 * entry of the player asking, and the counts of the registration.
 */
export const tournamentView = async (tournament, { playerId = null } = {}) => {
    const json = typeof tournament.toJSON === 'function' ? tournament.toJSON() : tournament;
    const ids = [...new Set([
        ...(json.entries ?? []).map(entry => String(entry.player)),
        ...(json.matches ?? []).flatMap(match => match.players).filter(Boolean),
    ])];
    const players = await db.player.find({ _id: { $in: ids } }, 'nickname firstname lastname profileImg country').lean();
    const entries = json.entries ?? [];
    return {
        ...json,
        players: Object.fromEntries(players.map(player => [String(player._id), {
            id: String(player._id), nickname: player.nickname, firstname: player.firstname, lastname: player.lastname, profileImg: player.profileImg, country: player.country,
        }])),
        counts: {
            in: entries.filter(entry => entry.status === 'in').length,
            out: entries.filter(entry => entry.status === 'out').length,
            invited: entries.filter(entry => entry.status === 'invited').length,
        },
        me: playerId ? entries.find(entry => String(entry.player) === String(playerId)) ?? null : null,
        myPlayer: playerId ? String(playerId) : null,
    };
};

// ---------------------------------------------------------------------------
// Once an hour
// ---------------------------------------------------------------------------

/**
 * The registrations that end, the reminders a day before, and the admins
 * told when a round starts with matches of the round before not played.
 */
export const runTournamentJobs = async (now = new Date()) => {
    const open = await db.tournament.find({ status: 'registration' });
    for (const tournament of open) {
        try {
            if (new Date(tournament.closesAt) <= now) {
                await closeRegistration(tournament);
            } else if (new Date(tournament.closesAt) - now <= REMINDER_HOURS * 60 * 60 * 1000 && !tournament.reminded.includes('registration')) {
                tournament.reminded.push('registration');
                await tournament.save();
                await invite(tournament, tournament.entries.filter(entry => entry.status === 'invited'), 'reminder');
            }
        } catch (err) {
            logger.error(err, `The registration job of the tournament ${tournament._id} failed`);
        }
    }

    const running = await db.tournament.find({ status: { $in: ['drawn', 'running'] } });
    for (const tournament of running) {
        try {
            const playing = tournament.rounds.filter(round => !round.skipped && round.date);
            for (let index = 1; index < playing.length; index += 1) {
                const round = playing[index];
                const key = `overdue:${round.size}`;
                if (dayOf(round.date) > dayOf(now) || tournament.reminded.includes(key)) continue;
                const before = playing[index - 1].size;
                const open = tournament.matches.filter(match => match.size === before && !isDecided(match)).length;
                if (!open) continue;
                tournament.reminded.push(key);
                await tournament.save();
                await tellAdmins(tournament, {
                    kind: 'tournamentOverdue',
                    title: `${tournament.name}: ${open} matches of the ${roundName(before)} not played yet`,
                    body: 'The next round starts today. Start them, or decide them on the tournament page.',
                });
            }
        } catch (err) {
            logger.error(err, `The round job of the tournament ${tournament._id} failed`);
        }
    }
};

