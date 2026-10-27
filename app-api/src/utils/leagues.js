import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { dueOf, leagueMatches, leagueSetupError, leagueTable, matchdayCount, matchdayDates, seasonOver } from '../rules/leagues.js';
import { cleanRules, isDecided } from '../rules/tournaments.js';
import { storedOf } from './game.view.js';
import { deliverQuietly } from './notify.js';
import { shirtOf } from './shirts.js';

/**
 * The leagues of a club (see rules/leagues.js): set up by its admins with
 * the players, how often they meet and the rules; started with the whole
 * season in matchdays; every match an X01 game (or decided by an admin), the
 * table worked out from them. The admins move matchdays and single matches.
 */

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 1000;

const failure = (message, status) => Object.assign(new Error(message), { status });
// a day as every language of the app reads it: 10.11.2026
const dayText = (date) => {
    const at = new Date(date);
    return `${String(at.getDate()).padStart(2, '0')}.${String(at.getMonth() + 1).padStart(2, '0')}.${at.getFullYear()}`;
};

// ---------------------------------------------------------------------------
// Telling people
// ---------------------------------------------------------------------------

const accountsOf = async (playerIds) => {
    const players = await db.player.find({ _id: { $in: playerIds.filter(Boolean) } }, 'user nickname').lean();
    return new Map(players.map(player => [String(player._id), player]));
};

const tellPlayers = async (league, playerIds, notice) => {
    const players = await accountsOf(playerIds);
    await deliverQuietly([...players.values()].filter(player => player.user).map(player => ({
        user: player.user, club: league.club, link: `/leagues/${league._id}`, ...(typeof notice === 'function' ? notice(player) : notice),
    })));
};

const tellAdmins = async (league, notice) => {
    const club = (await db.club.findById(league.club, 'admins').lean()) ?? { admins: [] };
    await deliverQuietly((club.admins ?? []).map(admin => ({ user: admin, club: league.club, link: `/leagues/${league._id}`, ...notice })));
};

// ---------------------------------------------------------------------------
// Setting up
// ---------------------------------------------------------------------------

/**
 * What an admin sent to set up a league, checked: { setup } or { error }.
 * Once it runs, only the name and description change (and the dates, on
 * their own way). The players have to be members of the club.
 */
export const checkSetup = async (body, clubId, stored = null) => {
    const name = String(body.name ?? stored?.name ?? '').trim();
    if (!name) return { error: 'Give the league a name.' };
    if (name.length > NAME_MAX) return { error: `The name is at most ${NAME_MAX} characters.` };
    const description = String(body.description ?? stored?.description ?? '').trim();
    if (description.length > DESCRIPTION_MAX) return { error: `The description is at most ${DESCRIPTION_MAX} characters.` };
    if (stored && stored.status !== 'draft') return { setup: { name, description } };

    const players = (Array.isArray(body.players) ? body.players : stored?.players ?? []).map(String);
    const meetings = Number(body.meetings ?? stored?.meetings ?? 1);
    const everyDays = Number(body.everyDays ?? stored?.everyDays ?? 7);
    const firstDay = body.firstDay ? new Date(body.firstDay) : stored?.firstDay ?? null;
    const rules = body.rules ?? stored?.rules;
    const problem = leagueSetupError({ players, meetings, rules, first: firstDay, everyDays });
    if (problem) return { error: problem };
    if (!players.every(id => db.mongoose.isValidObjectId(id))) return { error: 'Only players of the club play in its league.' };
    const known = await db.player.countDocuments({ _id: { $in: players }, clubs: clubId });
    if (known !== players.length) return { error: 'Only players of the club play in its league.' };
    return { setup: { name, description, players, meetings, everyDays, firstDay, rules: cleanRules(rules) } };
};

/**
 * Starts the season: every match in its matchday, the matchdays a week (or
 * two) apart from the first; every player hears the start and their first
 * match.
 */
export const startLeague = async (league) => {
    if (league.status !== 'draft') throw failure('The league has started already.', 409);
    const problem = leagueSetupError({ players: league.players, meetings: league.meetings, rules: league.rules, first: league.firstDay, everyDays: league.everyDays });
    if (problem) throw failure(problem, 422);
    const players = league.players.map(String);
    const matches = leagueMatches(players, league.meetings);
    const days = matchdayCount(players.length, league.meetings);
    league.matches = matches;
    league.matchdays = matchdayDates(league.firstDay, league.everyDays, days).map((date, index) => ({ day: index + 1, date }));
    league.status = 'running';
    league.startedAt = new Date();
    await league.save();
    logger.info(`League ${league._id} started: ${players.length} players, ${matches.length} matches on ${days} matchdays`);

    const names = await accountsOf(players);
    const firstOf = (playerId) => matches.filter(match => match.players.includes(playerId)).sort((a, b) => a.day - b.day)[0];
    await tellPlayers(league, players, (player) => {
        const first = firstOf(String(player._id));
        const other = first?.players.find(id => id !== String(player._id));
        return {
            kind: 'leagueStarted',
            title: `${league.name} has started`,
            body: first ? `Your first match: against ${names.get(other)?.nickname ?? '?'}, matchday ${first.day}` : '',
        };
    });
    return league;
};

// ---------------------------------------------------------------------------
// The matches
// ---------------------------------------------------------------------------

const plainMatches = (league) => league.matches.map(match => (typeof match.toObject === 'function' ? match.toObject() : { ...match })).map(match => ({ ...match, players: [...match.players] }));

/**
 * Starts a match as an X01 game with the league's rules, the given player
 * throwing first. A match already running answers with its game.
 */
export const startMatch = async (league, matchKey, { first = null } = {}) => {
    if (league.status !== 'running') throw failure('The league is not running.', 409);
    const matches = plainMatches(league);
    const match = matches.find(entry => entry.id === matchKey);
    if (!match) throw failure('There is no such match.', 404);
    if (match.status === 'running' && match.game) {
        const running = await db.x01.findById(match.game);
        if (running) return running;
    }
    if (match.status !== 'ready') throw failure('This match is decided.', 409);
    const [a, b] = match.players;
    const players = first === b ? [b, a] : [a, b];
    const stored = storedOf('x01', {
        ...cleanRules(league.rules),
        isSoloGame: false,
        players,
        currentPlayerTurn: players[0],
        startingPlayerSet: players[0],
        startingPlayerLeg: players[0],
        visits: [],
    });
    const game = await db.x01.create({ ...stored, club: league.club, friendly: false, league: { id: league._id, match: match.id } });
    match.status = 'running';
    match.game = game._id;
    league.matches = matches;
    await league.save();
    return game;
};

// legs (and sets) of a decided game, in the order of the match's players
const scoreOf = (view, match, rules) => {
    const models = view?.playerModels ?? {};
    const score = { legs: match.players.map(id => models[id]?.legsWon?.game ?? 0) };
    if (rules?.numberOfSets > 1) score.sets = match.players.map(id => models[id]?.setsWon ?? 0);
    return score;
};

// a match decided: the table counts it; the last one ends the season with its winner
const decide = async (league, matches, match, winner, extra = {}) => {
    Object.assign(match, { winner, decidedAt: new Date(), ...extra });
    league.matches = matches;
    const over = seasonOver(matches);
    if (over) {
        league.status = 'finished';
        league.finishedAt = new Date();
        league.winner = leagueTable(league.players.map(String), matches)[0]?.player ?? null;
    }
    await league.save();
    if (over) {
        const names = await accountsOf([league.winner]);
        await tellPlayers(league, league.players.map(String), { kind: 'leagueWon', title: `${names.get(league.winner)?.nickname ?? '?'} wins ${league.name}` });
        logger.info(`League ${league._id} won by ${league.winner}`);
    }
};

/**
 * A league game is over: its match is decided by it.
 */
export const leagueGameFinished = async (game, view) => {
    try {
        const league = await db.league.findById(game.league.id);
        if (!league || league.status !== 'running') return;
        const matches = plainMatches(league);
        const match = matches.find(entry => entry.id === game.league.match);
        if (!match || isDecided(match) || String(match.game) !== String(game._id)) return;
        const winner = match.players.find(id => view?.playerModels?.[id]?.hasWonGame);
        if (!winner) return;
        await decide(league, matches, match, winner, { status: 'done', score: scoreOf(view, match, league.rules) });
    } catch (err) {
        logger.error(err, `Failed to count the league game ${game._id}`);
    }
};

/**
 * A league game was deleted: a running match can be started again; a
 * decided one keeps its result, without the game.
 */
export const leagueGameDeleted = async (game) => {
    try {
        const league = await db.league.findById(game.league.id);
        if (!league) return;
        const matches = plainMatches(league);
        const match = matches.find(entry => entry.id === game.league.match && String(entry.game) === String(game._id));
        if (!match) return;
        if (match.status === 'running') match.status = 'ready';
        match.game = null;
        league.matches = matches;
        await league.save();
    } catch (err) {
        logger.error(err, `Failed to take the deleted game ${game._id} out of its league`);
    }
};

/**
 * An admin decides a match without (or instead of) a game: a walkover, or a
 * result played elsewhere. While the season runs it can be changed.
 */
export const setResult = async (league, matchKey, winner, { by = null } = {}) => {
    if (league.status !== 'running') throw failure('The league is not running.', 409);
    const matches = plainMatches(league);
    const match = matches.find(entry => entry.id === matchKey);
    if (!match) throw failure('There is no such match.', 404);
    if (!match.players.includes(String(winner))) throw failure('The winner has to be a player of the match.', 422);
    if (match.status === 'running' && match.game) {
        await db.x01.updateOne({ _id: match.game }, { $unset: { league: '' } });
        match.game = null;
    }
    await decide(league, matches, match, String(winner), { status: 'walkover', score: null, decidedBy: by });
    return league;
};

/**
 * An admin moves a matchday: its matches without a date of their own are
 * then due on the new day; their players hear it.
 */
export const moveMatchday = async (league, day, date) => {
    if (league.status !== 'running') throw failure('The league is not running.', 409);
    const when = new Date(date);
    if (Number.isNaN(when.getTime())) throw failure('Choose a day.', 422);
    const matchday = league.matchdays.find(entry => entry.day === Number(day));
    if (!matchday) throw failure('There is no such matchday.', 404);
    league.matchdays = league.matchdays.map(entry => ({ day: entry.day, date: entry.day === Number(day) ? when : entry.date }));
    await league.save();
    const players = [...new Set(league.matches.filter(match => match.day === Number(day) && !match.date && !isDecided(match)).flatMap(match => match.players))];
    await tellPlayers(league, players, { kind: 'leagueMoved', title: `${league.name}: matchday ${day} moved`, body: `Now due on ${dayText(when)}` });
    return league;
};

/**
 * An admin moves a single match (null: back to its matchday's day); its
 * players hear it.
 */
export const moveMatch = async (league, matchKey, date) => {
    if (league.status !== 'running') throw failure('The league is not running.', 409);
    const matches = plainMatches(league);
    const match = matches.find(entry => entry.id === matchKey);
    if (!match) throw failure('There is no such match.', 404);
    if (isDecided(match)) throw failure('This match is decided.', 409);
    const when = date ? new Date(date) : null;
    if (when && Number.isNaN(when.getTime())) throw failure('Choose a day.', 422);
    match.date = when;
    league.matches = matches;
    await league.save();
    const due = dueOf(league, match);
    await tellPlayers(league, match.players, { kind: 'leagueMoved', title: `${league.name}: your match moved`, body: due ? `Now due on ${dayText(due)}` : '' });
    return league;
};

export const cancelLeague = async (league) => {
    const told = league.status === 'running';
    league.status = 'cancelled';
    await league.save();
    if (told) await tellPlayers(league, league.players.map(String), { kind: 'leagueMoved', title: `${league.name} is cancelled` });
};

// ---------------------------------------------------------------------------
// For the app
// ---------------------------------------------------------------------------

/**
 * A league as the app shows it: with the names of its players and which of
 * them is the one asking.
 */
export const leagueView = async (league, { playerId = null } = {}) => {
    const json = typeof league.toJSON === 'function' ? league.toJSON() : league;
    const players = await db.player.find({ _id: { $in: (json.players ?? []).map(String) } }, 'nickname firstname lastname profileImg country shirt').lean();
    return {
        ...json,
        players: (json.players ?? []).map(String),
        names: Object.fromEntries(players.map(player => [String(player._id), {
            id: String(player._id), nickname: player.nickname, firstname: player.firstname, lastname: player.lastname, profileImg: player.profileImg, country: player.country, shirt: shirtOf(player),
        }])),
        myPlayer: playerId ? String(playerId) : null,
    };
};

// ---------------------------------------------------------------------------
// Once an hour
// ---------------------------------------------------------------------------

const dayOf = (date) => {
    const at = new Date(date);
    return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
};

/**
 * The admins hear once of a matchday that is over with matches not played.
 */
export const runLeagueJobs = async (now = new Date()) => {
    const running = await db.league.find({ status: 'running' });
    for (const league of running) {
        try {
            for (const matchday of league.matchdays) {
                const key = `overdue:${matchday.day}`;
                if (dayOf(matchday.date) >= dayOf(now) || league.reminded.includes(key)) continue;
                const open = league.matches.filter(match => match.day === matchday.day && !match.date && !isDecided(match)).length;
                if (!open) continue;
                league.reminded.push(key);
                await league.save();
                await tellAdmins(league, {
                    kind: 'leagueOverdue',
                    title: `${league.name}: ${open} matches of matchday ${matchday.day} not played`,
                    body: 'Start them, move them to another day, or decide them on the league page.',
                });
            }
        } catch (err) {
            logger.error(err, `The job of the league ${league._id} failed`);
        }
    }
};

