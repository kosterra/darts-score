import { randomBytes } from 'node:crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { MAX_BOARDS, boardsView, fill, hold, moveTo, nightItems, setBoards, topUp, tournamentItems } from '../rules/boards.js';
import { addDays, dayKey, isClubNight, isDayKey } from '../rules/calendar.js';
import { lockedOn, ruleViolations } from '../rules/club.rules.js';
import { answerOf, storedOf } from './game.view.js';
import { deliverQuietly } from './notify.js';
import { clubShirtOf } from './shirts.js';
import { boardCalledTitle, roundName } from './tournaments.js';

/**
 * A club night played on boards (see rules/boards.js): its admins set the
 * boards, the players there and the game every pairing plays; the API keeps
 * as many pairings waiting as boards are played on, calls them to the free
 * boards and frees a board as soon as its game is won. Also what the big
 * screen of the boards shows and the boards of a user (tournaments too).
 */

export const NIGHT_KINDS = ['x01', 'cricket', 'elimination'];
// the game of a pairing until the admins choose another, as a quick game starts
export const NIGHT_SETUP = { kind: 'x01', startingScore: 501, legOutMode: 'Double Out', numberOfLegs: 3, variant: 'Standard', targetScore: 301, gameOutMode: 'Double Out' };
export const NIGHT_SETUP_CHOICES = {
    startingScore: [301, 501], legOutMode: ['Double Out', 'Straight Out'], numberOfLegs: [1, 3, 5],
    variant: ['Standard', 'Cut-throat'], targetScore: [301, 501], gameOutMode: ['Double Out', 'Straight Out'],
};
export const NIGHT_MAX_PLAYERS = 40;
// what the big screen shows of the queue
export const SCREEN_QUEUE = 8;

const MODELS = { x01: db.x01, cricket: db.cricket, elimination: db.elimination };
const failure = (message, status) => Object.assign(new Error(message), { status });
const newEntryId = () => randomBytes(12).toString('hex');

const boardsOf = (host) => ({ count: host?.boards?.count ?? 0, out: [...(host?.boards?.out ?? [])] });
const plainEntries = (night) => (night.entries ?? []).map(entry => {
    const plain = typeof entry.toObject === 'function' ? entry.toObject() : { ...entry };
    return { ...plain, players: [...plain.players].map(String), game: plain.game?.id ? { kind: plain.game.kind, id: plain.game.id } : { kind: null, id: null } };
});

// the night a club plays on boards can be set up on its day (and after midnight): not before, not days later
const checkDay = (club, day, now = new Date()) => {
    if (!isDayKey(day)) throw failure('Choose a day.', 422);
    if (!isClubNight(club.calendar?.nights, day)) throw failure('There is no club night on that day.', 404);
    if ((club.calendar?.cancelled ?? []).some(entry => entry.day === day)) throw failure('This club night is cancelled.', 409);
    if (day < addDays(dayKey(now), -1)) throw failure('This club night is over.', 409);
};

// ---------------------------------------------------------------------------
// Calling the pairings to the boards
// ---------------------------------------------------------------------------

/**
 * Changes of boards (from rules/boards.js) on the entries: a pairing not
 * started is called with a board and queued without (it hears its next
 * board); one getting a board for the first time is called.
 * → the entries called now
 */
const applyChanges = (entries, changes, now = new Date()) => {
    const called = new Set();
    for (const { key, ...fields } of changes) {
        const entry = entries.find(item => item.id === key);
        if (!entry) continue;
        if ('held' in fields) entry.held = fields.held;
        if (!('board' in fields)) continue;
        entry.board = fields.board;
        if (['queued', 'called'].includes(entry.status)) entry.status = fields.board ? 'called' : 'queued';
        if (!fields.board && entry.status === 'queued') {
            entry.calledAt = null;
            called.delete(entry);
        } else if (fields.board && !entry.calledAt) {
            entry.calledAt = now;
            called.add(entry);
        }
    }
    return [...called];
};

/**
 * New pairings for the queue (as many waiting as boards are played on),
 * the free boards filled, and the queue topped up again. Puts the entries
 * on the night. → the entries called now
 */
const settleNight = (night, entries, now = new Date()) => {
    const boards = boardsOf(night);
    const players = [...(night.players ?? [])].map(String);
    const topUpQueue = () => {
        for (const pair of topUp({ boards, players, entries })) {
            entries.push({ id: newEntryId(), players: pair, status: 'queued', board: null, held: false, game: { kind: null, id: null }, winner: null, readyAt: now, calledAt: null, doneAt: null });
        }
    };
    topUpQueue();
    const called = applyChanges(entries, fill(boards, nightItems({ entries })), now);
    topUpQueue();
    night.entries = entries;
    return called;
};

// the players of pairings called to a board hear which board, and against whom
const tellCalled = async (night, called) => {
    const list = called.filter(entry => entry.board);
    if (!list.length) return;
    const players = await db.player.find({ _id: { $in: list.flatMap(entry => entry.players) } }, 'user nickname').lean();
    const byId = new Map(players.map(player => [String(player._id), player]));
    await deliverQuietly(list.flatMap(entry => entry.players.map(id => byId.get(id)).filter(player => player?.user).map(player => ({
        user: player.user, club: night.club, link: `/club-night/${night.day}`, kind: 'boardCalled',
        title: boardCalledTitle(entry.board, byId.get(entry.players.find(id => id !== String(player._id)))?.nickname ?? '?'),
        body: 'Club night',
    }))));
};

// two games finishing at once both save the entries: the one that lost the race reads them again
const withRetry = async (work) => {
    try {
        return await work();
    } catch (err) {
        if (err.name !== 'VersionError') throw err;
        return work();
    }
};

// ---------------------------------------------------------------------------
// The night as the admins set it up
// ---------------------------------------------------------------------------

export const loadNight = (club, day) => db.boardNight.findOne({ club: club._id, day });

// the game of a pairing from what an admin sent: only the known settings, each one of its choices
const setupOf = (sent, before) => {
    const setup = { ...NIGHT_SETUP, ...(before ?? {}) };
    if (NIGHT_KINDS.includes(sent?.kind)) setup.kind = sent.kind;
    for (const [key, choices] of Object.entries(NIGHT_SETUP_CHOICES)) {
        if (sent?.[key] !== undefined && choices.includes(sent[key])) setup[key] = sent[key];
    }
    return setup;
};

/**
 * An admin sets up the boards of a night or changes them: { count, out,
 * players, setup }, each optional. A new night starts with the club's
 * boards, the players who said they come and the usual game. A player taken
 * out leaves the pairings not started; boards that go send their pairing
 * back to the queue (first). → the night
 */
export const saveNight = async (club, day, body, { by = null, now = new Date() } = {}) => {
    checkDay(club, day, now);
    let night = await loadNight(club, day);
    if (!night) {
        const coming = body.players === undefined
            ? (await db.attendance.find({ club: club._id, day, answer: 'yes' }, 'player').lean()).map(entry => String(entry.player))
            : [];
        night = new db.boardNight({ club: club._id, day, boards: { count: club.boards || 2, out: [] }, setup: NIGHT_SETUP, players: coming, createdBy: by });
    }
    if (body.setup !== undefined) {
        const before = typeof night.setup?.toObject === 'function' ? night.setup.toObject() : night.setup;
        night.setup = setupOf(body.setup, before);
    }
    if (body.players !== undefined) {
        const sent = [...new Set(body.players.map(String))].filter(id => db.mongoose.isValidObjectId(id)).slice(0, NIGHT_MAX_PLAYERS);
        const members = new Set((await db.player.find({ _id: { $in: sent }, clubs: club._id }, '_id').lean()).map(player => String(player._id)));
        night.players = sent.filter(id => members.has(id));
    }
    const entries = plainEntries(night);
    const there = new Set(night.players.map(String));
    for (const entry of entries) {
        if (['queued', 'called'].includes(entry.status) && entry.players.some(id => !there.has(id))) Object.assign(entry, { status: 'cancelled', board: null, doneAt: now });
    }
    const called = [];
    if (body.count !== undefined || body.out !== undefined) {
        const current = boardsOf(night);
        const { boards, changes } = setBoards(nightItems({ entries }), { count: body.count ?? current.count, out: body.out ?? current.out });
        night.boards = boards;
        called.push(...applyChanges(entries, changes, now));
    }
    called.push(...settleNight(night, entries, now).filter(entry => !called.includes(entry)));
    await night.save();
    await tellCalled(night, called);
    return night;
};

/**
 * An admin changes a pairing: { board } moves it (or swaps it with the one
 * there), { held } holds it back or lets it in again, { status: 'cancelled' }
 * takes it out. → the night
 */
export const changeEntry = async (night, entryId, body, now = new Date()) => {
    const entries = plainEntries(night);
    const entry = entries.find(item => item.id === entryId);
    if (!entry) throw failure('There is no such match.', 404);
    const boards = boardsOf(night);
    const called = [];
    if (body.status === 'cancelled') {
        if (!['queued', 'called'].includes(entry.status)) throw failure('Only a match not started yet can be cancelled.', 409);
        Object.assign(entry, { status: 'cancelled', board: null, doneAt: now });
    } else {
        const decided = body.board !== undefined
            ? moveTo(boards, nightItems({ entries }), entryId, body.board)
            : hold(boards, nightItems({ entries }), entryId, Boolean(body.held));
        if (decided.error) throw failure(decided.error, 409);
        called.push(...applyChanges(entries, decided.changes, now));
    }
    called.push(...settleNight(night, entries, now).filter(item => !called.includes(item)));
    await night.save();
    await tellCalled(night, called);
    return night;
};

// a new club game of the night's setup, the players in the order they throw
const gameOf = (setup, players) => {
    const common = { isSoloGame: false, players, currentPlayerTurn: players[0], visits: [] };
    if (setup.kind === 'x01') {
        return {
            ...common, startingScore: setup.startingScore, legInMode: 'Straight In', legOutMode: setup.legOutMode,
            setMode: 'Best of', legMode: 'Best of', numberOfSets: 1, numberOfLegs: setup.numberOfLegs,
            startingPlayerSet: players[0], startingPlayerLeg: players[0],
        };
    }
    if (setup.kind === 'elimination') return { ...common, targetScore: setup.targetScore, gameInMode: 'Straight In', gameOutMode: setup.gameOutMode, startingPlayer: players[0] };
    return { ...common, variant: setup.variant, startingScore: 0 };
};

/**
 * A pairing starts its game (a player of it, or an admin): a club game of
 * the night's setup, with the club's own rules on top; the one given throws
 * first. A pairing already playing answers with its game.
 * → { game: { kind, id }, created }
 */
export const startEntry = async (club, night, entryId, { first = null, playerId = null, isAdmin = false } = {}) => {
    const entries = plainEntries(night);
    const entry = entries.find(item => item.id === entryId);
    if (!entry) throw failure('There is no such match.', 404);
    if (!isAdmin && !(playerId && entry.players.includes(String(playerId)))) throw failure('Only the players of a match or a club admin can start it.', 403);
    if (entry.status === 'playing' && entry.game?.id && await MODELS[entry.game.kind]?.exists({ _id: entry.game.id })) {
        return { game: { kind: entry.game.kind, id: String(entry.game.id) }, created: false };
    }
    if (!['queued', 'called', 'playing'].includes(entry.status)) throw failure('This match is decided.', 409);
    const [a, b] = entry.players;
    const players = String(first) === b ? [b, a] : [a, b];
    const setup = { ...NIGHT_SETUP, ...(typeof night.setup?.toObject === 'function' ? night.setup.toObject() : night.setup) };
    const kind = setup.kind;
    const sent = lockedOn(kind, club.gameRules, gameOf(setup, players));
    const problems = ruleViolations(kind, club.gameRules, sent);
    if (problems.length) throw failure(problems.join(' '), 422);
    const game = await MODELS[kind].create({ ...storedOf(kind, sent), club: club._id, friendly: false });
    Object.assign(entry, { status: 'playing', held: false, game: { kind, id: game._id } });
    night.entries = entries;
    await night.save();
    logger.info(`Club night ${night.day} of club ${club._id}: board ${entry.board ?? '-'} started the ${kind} game ${game._id}`);
    return { game: { kind, id: String(game._id) }, created: true };
};

// ---------------------------------------------------------------------------
// The games of the night
// ---------------------------------------------------------------------------

/**
 * A club game is won: when a pairing of a night on boards played it, the
 * pairing is done and its board is called again at once.
 * view: the game with its results worked out (answerOf).
 */
export const boardGameFinished = async (game, view) => {
    try {
        await withRetry(async () => {
            const night = await db.boardNight.findOne({ 'entries.game.id': game._id });
            if (!night) return;
            const entries = plainEntries(night);
            const entry = entries.find(item => String(item.game?.id) === String(game._id));
            if (!entry || entry.status !== 'playing') return;
            const now = new Date();
            Object.assign(entry, { status: 'done', doneAt: now, winner: entry.players.find(id => view?.playerModels?.[id]?.hasWonGame) ?? null });
            const called = settleNight(night, entries, now);
            await night.save();
            await tellCalled(night, called);
        });
    } catch (err) {
        logger.error(err, `Failed to free the board of the game ${game._id}`);
    }
};

// a game of a pairing was deleted: the pairing stays on its board, called again
export const boardGameDeleted = async (game) => {
    try {
        await withRetry(async () => {
            const night = await db.boardNight.findOne({ 'entries.game.id': game._id });
            if (!night) return;
            const entries = plainEntries(night);
            const entry = entries.find(item => String(item.game?.id) === String(game._id));
            if (!entry || entry.status !== 'playing') return;
            Object.assign(entry, { status: entry.board ? 'called' : 'queued', game: { kind: null, id: null } });
            settleNight(night, entries);
            await night.save();
        });
    } catch (err) {
        logger.error(err, `Failed to take the deleted game ${game._id} off its board`);
    }
};

// ---------------------------------------------------------------------------
// For the app
// ---------------------------------------------------------------------------

const personOf = (player) => ({ id: String(player._id), nickname: player.nickname, firstname: player.firstname ?? '', lastname: player.lastname ?? '', profileImg: player.profileImg ?? '' });

/**
 * A night on boards as the app shows it: the boards, the setup, the players
 * there, every pairing, and the boards with the queue (or null).
 */
export const nightView = async (night, { playerId = null, isAdmin = false } = {}) => {
    if (!night) return null;
    const json = typeof night.toJSON === 'function' ? night.toJSON() : night;
    const entries = plainEntries(json);
    const ids = [...new Set([...(json.players ?? []).map(String), ...entries.flatMap(entry => entry.players)])].filter(id => db.mongoose.isValidObjectId(id));
    const found = new Map((await db.player.find({ _id: { $in: ids } }, 'nickname firstname lastname profileImg').lean()).map(player => [String(player._id), player]));
    const boards = boardsOf(json);
    return {
        id: String(json.id ?? json._id),
        day: json.day,
        boards,
        setup: { ...NIGHT_SETUP, ...(json.setup ?? {}) },
        players: (json.players ?? []).map(id => found.get(String(id))).filter(Boolean).map(personOf),
        entries: entries.map(entry => ({
            id: entry.id, players: entry.players, status: entry.status, board: entry.board ?? null, held: Boolean(entry.held),
            game: entry.game?.id ? { kind: entry.game.kind, id: String(entry.game.id) } : null,
            winner: entry.winner ?? null, readyAt: entry.readyAt ?? null, calledAt: entry.calledAt ?? null, doneAt: entry.doneAt ?? null,
        })),
        boardView: boardsView(boards, nightItems({ entries })),
        myPlayer: playerId ? String(playerId) : null,
        canRun: Boolean(isAdmin),
    };
};

/**
 * The matches of a user that hold a board now (called or playing), in a
 * tournament or a club night of any of their clubs, for "Your match".
 * → [{ source, id, key, club, title, link, board, status, opponent, game, calledAt }]
 */
export const myBoards = async (userId, now = new Date()) => {
    const own = (await db.player.find({ user: userId }, '_id').lean()).map(player => String(player._id));
    if (!own.length) return [];
    const [tournaments, nights] = await Promise.all([
        db.tournament.find({
            status: { $in: ['drawn', 'running'] }, 'boards.count': { $gt: 0 },
            matches: { $elemMatch: { players: { $in: own }, board: { $ne: null }, status: { $in: ['ready', 'running'] } } },
        }, 'club name matches').lean(),
        db.boardNight.find({
            day: { $gte: addDays(dayKey(now), -1) },
            entries: { $elemMatch: { players: { $in: own }, board: { $ne: null }, status: { $in: ['called', 'playing'] } } },
        }).lean(),
    ]);
    const found = [
        ...tournaments.flatMap(tournament => tournament.matches
            .filter(match => match.board && ['ready', 'running'].includes(match.status) && match.players.some(id => own.includes(String(id))))
            .map(match => ({
                source: 'tournament', id: String(tournament._id), key: match.id, club: String(tournament.club), title: tournament.name, link: `/tournaments/${tournament._id}`,
                board: match.board, status: match.status === 'running' ? 'playing' : 'called', players: match.players.map(String),
                game: match.game ? { kind: 'x01', id: String(match.game) } : null, calledAt: match.calledAt ?? null,
            }))),
        ...nights.flatMap(night => night.entries
            .filter(entry => entry.board && ['called', 'playing'].includes(entry.status) && entry.players.some(id => own.includes(String(id))))
            .map(entry => ({
                source: 'night', id: night.day, key: entry.id, club: String(night.club), title: 'Club night', link: `/club-night/${night.day}`,
                board: entry.board, status: entry.status, players: entry.players.map(String),
                game: entry.game?.id ? { kind: entry.game.kind, id: String(entry.game.id) } : null, calledAt: entry.calledAt ?? null,
            }))),
    ];
    const others = found.map(item => item.players.find(id => !own.includes(id))).filter(Boolean);
    const [players, clubs] = await Promise.all([
        db.player.find({ _id: { $in: others } }, 'nickname profileImg').lean(),
        db.club.find({ _id: { $in: [...new Set(found.map(item => item.club))] } }, 'name').lean(),
    ]);
    const playerById = new Map(players.map(player => [String(player._id), player]));
    const clubById = new Map(clubs.map(club => [String(club._id), club]));
    return found.map(({ players: ids, club, ...item }) => {
        const other = playerById.get(ids.find(id => !own.includes(id)));
        return {
            ...item,
            club: { id: club, name: clubById.get(club)?.name ?? '' },
            opponent: other ? { id: String(other._id), nickname: other.nickname, profileImg: other.profileImg ?? '' } : null,
        };
    });
};

// ---------------------------------------------------------------------------
// The big screen of the boards
// ---------------------------------------------------------------------------

// the legs (and sets) won and the score now of a game going on, in the order of its players
const liveOf = async (kind, gameId, players) => {
    const doc = gameId && MODELS[kind] ? await MODELS[kind].findById(gameId) : null;
    if (!doc) return { legs: null, sets: null, score: null };
    const models = answerOf(kind, doc)?.playerModels ?? {};
    const inSets = kind === 'x01' && doc.numberOfSets > 1;
    return {
        legs: kind === 'x01' ? players.map(id => (inSets ? models[id]?.currentSetLegsWon : models[id]?.legsWon?.game) ?? 0) : null,
        sets: inSets ? players.map(id => models[id]?.setsWon ?? 0) : null,
        score: players.map(id => models[id]?.score ?? null),
    };
};

/**
 * What the big screen of the boards shows (kind 'tournamentBoards' or
 * 'nightBoards'): every board with its players and, for a game going on, the
 * legs and the score; the first of the queue; the title and the club.
 * → the answer, or null when the tournament or night is gone
 */
export const boardsScreen = async (kind, id) => {
    const host = kind === 'tournamentBoards' ? await db.tournament.findById(id).lean() : await db.boardNight.findById(id).lean();
    if (!host) return null;
    const tournament = kind === 'tournamentBoards';
    const sources = tournament
        ? new Map(host.matches.map(match => [match.id, { players: match.players.map(String), game: match.game ? { kind: 'x01', id: match.game } : null, calledAt: match.calledAt, round: roundName(match.group != null ? 0 : match.size) }]))
        : new Map(plainEntries(host).map(entry => [entry.id, { players: entry.players, game: entry.game?.id ? entry.game : null, calledAt: entry.calledAt, round: null }]));
    const view = boardsView(boardsOf(host), tournament ? tournamentItems(host) : nightItems(host));
    const queue = view.queue.slice(0, SCREEN_QUEUE).map(key => sources.get(key));
    const shown = [...view.boards.map(board => sources.get(board.key)).filter(Boolean), ...queue];
    const [players, club] = await Promise.all([
        db.player.find({ _id: { $in: [...new Set(shown.flatMap(source => source.players))].filter(Boolean) } }, 'nickname country').lean(),
        db.club.findById(host.club, 'name logo accent shirt').lean(),
    ]);
    const byId = new Map(players.map(player => [String(player._id), { id: String(player._id), nickname: player.nickname, country: player.country ?? '' }]));
    const people = (ids) => ids.map(playerId => byId.get(playerId)).filter(Boolean);
    const boards = await Promise.all(view.boards.slice(0, MAX_BOARDS).map(async board => {
        const source = board.key ? sources.get(board.key) : null;
        const live = board.status === 'playing' && source?.game ? await liveOf(source.game.kind, source.game.id, source.players) : { legs: null, sets: null, score: null };
        return {
            number: board.number, out: board.out, status: board.status, calledAt: source?.calledAt ?? null, round: source?.round ?? null,
            players: source ? people(source.players) : [], ...live,
        };
    }));
    return {
        kind,
        title: tournament ? host.name : 'Club night',
        club: club ? { name: club.name, logo: club.logo ?? '', accent: club.accent ?? null, shirt: clubShirtOf(club) } : null,
        boards,
        queue: queue.map(source => ({ round: source.round, players: people(source.players) })),
    };
};
