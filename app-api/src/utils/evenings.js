import crypto from 'node:crypto';
import db from '../models/db.model.js';
import { NAME, QUICK_PLAYER_IDS, hashKey, newKey, quickGameError } from './quick.games.js';
import { storedOf, viewOf } from './game.view.js';
import { countEvening } from './quick.tally.js';

/**
 * A darts evening without an account: a group plays game after game (X01,
 * Cricket or Elimination, two to four of them at a time) as quick games,
 * with a table of the evening, awards at the end and a link to follow it
 * read-only. Whoever wants to keep it makes it a club: the players and the
 * evening's games are taken over.
 */

export const EVENING_PLAYERS = { min: 2, max: 8 };
export const EVENING_NAME_MAX = 60;
const GAME_MODELS = { x01: () => db.x01, cricket: () => db.cricket, elimination: () => db.elimination };

export const newShareToken = () => crypto.randomBytes(12).toString('base64url');

/**
 * Why an evening cannot be set up so, or null: 2 to 8 players, each with a
 * name of their own; the evening's name at most EVENING_NAME_MAX characters.
 */
export const eveningError = ({ name = '', names } = {}) => {
    if (typeof name !== 'string' || name.trim().length > EVENING_NAME_MAX) return 'The name of the evening is at most 60 characters.';
    if (!Array.isArray(names) || names.length < EVENING_PLAYERS.min || names.length > EVENING_PLAYERS.max) return 'An evening has 2 to 8 players.';
    const trimmed = names.map(entry => (typeof entry === 'string' ? entry.trim() : ''));
    if (trimmed.some(entry => !NAME.test(entry))) return 'A name has 1 to 20 letters or digits.';
    if (new Set(trimmed.map(entry => entry.toLowerCase())).size !== trimmed.length) return 'Every player needs a name of their own.';
    return null;
};

// a new evening: { fields to store, key }
export const newEvening = ({ name = '', names }) => {
    const key = newKey();
    return {
        key,
        fields: {
            name: name.trim(),
            players: names.map((entry, index) => ({ id: QUICK_PLAYER_IDS[index], name: entry.trim() })),
            keyHash: hashKey(key),
            shareToken: newShareToken(),
        },
    };
};

/**
 * Why a game cannot be played in the evening, or null: a quick game whose
 * players are players of the evening, under their names.
 */
export const eveningGameError = (evening, kind, game) => {
    const error = quickGameError(kind, game);
    if (error) return error;
    if ((game.players ?? []).length < 2) return 'A game of the evening has 2 to 4 players.';
    const names = new Map(evening.players.map(player => [player.id, player.name]));
    for (const player of game.quickPlayers) {
        if (names.get(player.id) !== player.nickname.trim()) return 'The players of a game are players of the evening.';
    }
    return null;
};

// ---------------------------------------------------------------------------
// The table, the awards, the head to head and the form
// ---------------------------------------------------------------------------

const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * What the evening's games tell, from the quick games (docs with kind and
 * data), in the order they were played:
 * { table, awards, headToHead, form, played, running }.
 * table: per player games, wins, win rate, and in X01 the average (points
 * per three darts over all their X01 darts), 180s and the highest checkout,
 * the best first (wins, then win rate, then average).
 */
export const eveningReport = (evening, games) => {
    const ids = evening.players.map(player => player.id);
    const rows = new Map(ids.map(id => [id, { id, name: evening.players.find(player => player.id === id).name, games: 0, wins: 0, points: 0, darts: 0, oneEighties: 0, highestCheckout: 0, x01Games: 0 }]));
    const headToHead = Object.fromEntries(ids.map(a => [a, Object.fromEntries(ids.filter(b => b !== a).map(b => [b, 0]))]));
    const form = Object.fromEntries(ids.map(id => [id, []]));
    let running = 0;
    const ordered = [...games].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const game of ordered) {
        if (!game.hasWinner) {
            if (game.gameIsRunning) running += 1;
            continue;
        }
        const view = viewOf(game.kind, game.data);
        const players = (view.players ?? []).filter(id => rows.has(id));
        const winner = players.find(id => view.playerModels?.[id]?.hasWonGame);
        for (const id of players) {
            const row = rows.get(id);
            row.games += 1;
            if (id === winner) row.wins += 1;
            else if (winner) headToHead[winner][id] += 1;
            if (game.kind === 'x01') {
                const model = view.playerModels?.[id] ?? {};
                const darts = model.totalThrow?.game?.darts ?? 0;
                const average = model.averages?.game?.overall ?? 0;
                row.x01Games += 1;
                row.darts += darts;
                row.points += (average * darts) / 3;
                row.oneEighties += model.scoreRanges?.game?.['180'] ?? 0;
                row.highestCheckout = Math.max(row.highestCheckout, ...Object.keys(model.checkoutScores?.game ?? {}).map(Number).filter(Number.isFinite), 0);
                form[id].push(round(average));
            }
        }
    }
    const table = [...rows.values()].map(row => ({
        id: row.id,
        name: row.name,
        games: row.games,
        wins: row.wins,
        winRate: row.games ? Math.round((row.wins / row.games) * 100) : 0,
        average: row.darts ? round((row.points / row.darts) * 3, 2) : null,
        oneEighties: row.oneEighties,
        highestCheckout: row.highestCheckout || null,
    })).sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || (b.average ?? 0) - (a.average ?? 0) || a.name.localeCompare(b.name));

    // the awards: whoever leads in each, once anyone has something to show
    const played = table.filter(row => row.games > 0);
    const best = (value) => [...played].filter(row => value(row) > 0).sort((a, b) => value(b) - value(a))[0] ?? null;
    const awards = [];
    const champion = played.length && played[0].wins > 0 ? played[0] : null;
    if (champion) awards.push({ id: 'champion', player: champion.id, value: champion.wins });
    const average = best(row => row.average ?? 0);
    if (average) awards.push({ id: 'average', player: average.id, value: average.average });
    const oneEighties = best(row => row.oneEighties);
    if (oneEighties) awards.push({ id: 'oneEighties', player: oneEighties.id, value: oneEighties.oneEighties });
    const checkout = best(row => row.highestCheckout ?? 0);
    if (checkout) awards.push({ id: 'checkout', player: checkout.id, value: checkout.highestCheckout });
    // the wooden spoon, in good humour: the lowest win rate of those who played at least half
    // as many games as the busiest player (one unlucky game alone does not earn it early on)
    const enough = Math.max(1, Math.ceil(Math.max(0, ...played.map(row => row.games)) / 2));
    const spoon = played.filter(row => row.games >= enough).sort((a, b) => a.winRate - b.winRate || a.wins - b.wins || b.games - a.games).at(0);
    if (spoon && played.length > 2 && spoon.id !== champion?.id) awards.push({ id: 'woodenSpoon', player: spoon.id, value: spoon.wins });

    return { table, awards, headToHead, form, played: ordered.filter(game => game.hasWinner).length, running };
};

// ---------------------------------------------------------------------------
// The end of the evening
// ---------------------------------------------------------------------------

// an evening nobody ends ends by itself so long after its last game (or its start)
export const EVENING_ENDS_AFTER_HOURS = 12;
const HOUR = 60 * 60 * 1000;

// the last time anything happened: its start, or a game started or played on
export const lastActivityOf = (evening, games) => new Date(Math.max(new Date(evening.createdAt).getTime(), ...games.map(game => new Date(game.updatedAt ?? game.createdAt).getTime())));

/**
 * When the evening ends: { endedAt (null while it goes on), endsAt (when it
 * will end by itself) }. An evening made a club ends with it.
 */
export const endOf = (evening, games, now = new Date()) => {
    if (evening.endedAt) return { endedAt: new Date(evening.endedAt), endsAt: null };
    if (evening.adoptedAt) return { endedAt: new Date(evening.adoptedAt), endsAt: null };
    const endsAt = new Date(lastActivityOf(evening, games).getTime() + EVENING_ENDS_AFTER_HOURS * HOUR);
    return endsAt <= now ? { endedAt: endsAt, endsAt: null } : { endedAt: null, endsAt };
};

/**
 * Once an hour: the evenings nobody ended end by themselves, 12 hours after
 * their last game, and count as played when a game of them was finished.
 */
export const runEveningJobs = async (now = new Date()) => {
    const open = await db.quickEvening.find({ endedAt: null, club: null, createdAt: { $lte: new Date(now.getTime() - EVENING_ENDS_AFTER_HOURS * HOUR) } });
    for (const evening of open) {
        const games = await db.quickGame.find({ evening: evening._id }, 'createdAt updatedAt').lean();
        const { endedAt } = endOf(evening, games, now);
        if (!endedAt) continue;
        evening.endedAt = endedAt;
        await evening.save();
        await countEvening(evening);
    }
};

// a game of the evening in its list: what was played by whom, and how it went
export const gameSummary = (game) => {
    const data = game.data ?? {};
    const view = viewOf(game.kind, data);
    const winner = (view.players ?? []).find(id => view.playerModels?.[id]?.hasWonGame) ?? null;
    return {
        id: String(game._id),
        kind: game.kind,
        players: data.players ?? [],
        winner,
        // each player's result: the legs won in X01, the score in Cricket and Elimination
        results: (data.players ?? []).map(id => {
            const model = view.playerModels?.[id] ?? {};
            return game.kind === 'x01'
                ? { player: id, legs: model.legsWon?.game ?? 0, isWinner: id === winner }
                : { player: id, score: model.score ?? null, isWinner: id === winner };
        }),
        finished: Boolean(game.hasWinner),
        running: Boolean(game.gameIsRunning) && !game.hasWinner,
        setup: game.kind === 'x01'
            ? { startingScore: data.startingScore, legOutMode: data.legOutMode, numberOfLegs: data.numberOfLegs }
            : game.kind === 'elimination'
                ? { targetScore: data.targetScore, gameOutMode: data.gameOutMode }
                : { variant: data.variant },
        createdAt: game.createdAt,
    };
};

/**
 * The evening as the app shows it: its players and games with the report,
 * when it ended (or ends by itself);
 * the link to share it only for the browser that runs it (owner).
 */
export const eveningView = (evening, games, { owner = false } = {}) => ({
    id: String(evening._id),
    name: evening.name,
    players: evening.players.map(({ id, name }) => ({ id, name })),
    games: [...games].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(gameSummary),
    report: eveningReport(evening, games),
    createdAt: evening.createdAt,
    club: evening.club ? String(evening.club) : null,
    // when it ended (null: it goes on), or when it ends by itself
    ...endOf(evening, games),
    ...(owner ? { shareToken: evening.shareToken } : {}),
});

// ---------------------------------------------------------------------------
// Making it a club
// ---------------------------------------------------------------------------

/**
 * Makes the evening a club of the user: the club with the user as its admin,
 * a player for each player of the evening (the user's own one, "me", gets
 * their login), and the evening's finished games taken over with their dates,
 * counted in the club's statistics and badges. → { club, players }
 */
export const adoptEvening = async (evening, user, { name, me = null } = {}) => {
    if (evening.club) throw Object.assign(new Error('This evening is a club already.'), { status: 409 });
    const clubName = String(name ?? '').trim();
    if (!clubName || clubName.length > 60) throw Object.assign(new Error('Give the club a name of at most 60 characters.'), { status: 422 });
    if (me && !evening.players.some(player => player.id === me)) throw Object.assign(new Error('Choose one of the players of the evening.'), { status: 422 });

    const club = await db.club.create({ name: clubName, admins: [user._id] });
    const players = new Map();
    for (const player of evening.players) {
        const created = await db.player.create({
            firstname: player.name, lastname: '-', nickname: player.name, clubs: [club._id],
            ...(player.id === me ? { user: user._id, firstname: user.firstname, lastname: user.lastname } : {}),
        });
        players.set(player.id, String(created._id));
    }

    const games = await db.quickGame.find({ evening: evening._id, hasWinner: true }).sort({ createdAt: 1 }).lean();
    const { syncGameBadges } = await import('./badge.service.js');
    for (const game of games) {
        const data = game.data ?? {};
        const map = (id) => players.get(id) ?? id;
        // eslint-disable-next-line no-unused-vars
        const { quickPlayers, playerModels, ...rest } = data;
        const stored = storedOf(game.kind, {
            ...rest,
            players: (data.players ?? []).map(map),
            currentPlayerTurn: map(data.currentPlayerTurn),
            ...(data.startingPlayerSet ? { startingPlayerSet: map(data.startingPlayerSet), startingPlayerLeg: map(data.startingPlayerLeg) } : {}),
            ...(data.starter ? { starter: map(data.starter) } : {}),
            visits: (data.visits ?? []).map(visit => ({ ...visit, player: map(visit.player) })),
            flyingDarts: 'players',
        });
        const doc = await GAME_MODELS[game.kind]().create({ ...stored, club: club._id, friendly: false });
        // the game keeps the day it was played
        await GAME_MODELS[game.kind]().updateOne({ _id: doc._id }, { $set: { createdAt: game.createdAt, updatedAt: game.updatedAt } }, { timestamps: false });
        await syncGameBadges(club._id, { ...doc.toObject(), createdAt: game.createdAt, updatedAt: game.updatedAt }, game.kind);
    }

    evening.club = club._id;
    evening.adoptedAt = new Date();
    await evening.save();
    return { club, players: Object.fromEntries(players), games: games.length };
};
