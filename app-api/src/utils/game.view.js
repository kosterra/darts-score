import { DERIVED, REPLAY } from '../rules/stored.js';
import { isLegacy, legacyHandicap, legacyStarter, legacyVisits } from './legacy.games.js';

/**
 * The games of X01, Cricket, Elimination and Around the Clock are stored as
 * their settings, players and visits, with the results worked out from them
 * (the player models, whose turn it is, whether it is over), so lists and
 * queries need no replay. Everything else (the legs and their visits with what
 * was left, the sets played, the darts of Around the Clock as values) is
 * worked out again by the rules of the app (src/rules, the app's copy).
 */

// the results kept with the game, from its visits
const RESULTS = ['playerModels', 'currentPlayerTurn', 'gameIsRunning', 'hasWinner'];

export const hasRules = (type) => Boolean(REPLAY[type]);

/**
 * A game as it was stored before visits: its visits, who threw first (when
 * not the first player) and, for X01, the players' own rules of a handicap.
 */
const fromLegacy = (type, game) => {
    const visits = legacyVisits(type, game);
    const starter = game.starter ?? legacyStarter(game, visits);
    const handicap = (type === 'x01' || type === 'x01training') && !game.handicap ? legacyHandicap(game) : null;
    return { ...game, visits, ...(starter && type !== 'clock' ? { starter } : {}), ...(handicap ? { handicap } : {}) };
};

const plain = (game) => (typeof game?.toObject === 'function' ? game.toObject() : game);

// replays of finished games stay the same: kept for a while
const cache = new Map();
const CACHE_SIZE = 2000;

/**
 * The whole game as the app shows it, from the stored one. Games of other
 * types come back as they are.
 */
export const viewOf = (type, game) => {
    const replay = REPLAY[type];
    if (!replay || !game) return game;
    const stored = plain(game);
    const key = stored._id && stored.updatedAt ? `${type}:${stored._id}:${new Date(stored.updatedAt).getTime()}` : null;
    if (key && cache.has(key)) return cache.get(key);
    // a game not moved to visits yet: its visits are in what it was stored as
    const source = Array.isArray(stored.visits) ? stored : fromLegacy(type, stored);
    const view = { ...replay(source), _id: stored._id };
    if (key) {
        if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value);
        cache.set(key, view);
    }
    return view;
};

/**
 * What is stored of a game sent by the app: what it sent, without what
 * follows from the visits, and with the results worked out here from the
 * visits (so they always match them). X01: the players' own rules of a
 * handicap, which the app sends in their player models, are kept as "handicap".
 */
export const storedOf = (type, body) => {
    // an older app sends the game as it was stored before: its visits are in there
    const sent = isLegacy(type, body) ? fromLegacy(type, body) : body;
    const game = { ...sent, visits: (sent.visits ?? []).map(({ player, darts }) => ({ player, darts: (darts ?? []).filter(dart => dart !== '' && dart != null) })) };
    if ((type === 'x01' || type === 'x01training') && !game.handicap) {
        const handicap = legacyHandicap(game);
        if (handicap) game.handicap = handicap;
    }
    const view = REPLAY[type](game);
    const stored = Object.fromEntries(Object.entries(game).filter(([key]) => !(DERIVED[type] ?? []).includes(key)));
    for (const key of RESULTS) stored[key] = view[key];
    stored.numberOfPlayers = (game.players ?? []).length;
    return stored;
};

// what shows a game has been worked out from its visits already
const WORKED_OUT = { x01: 'allSetsThrows', x01training: 'allSetsThrows', cricket: 'allThrows', elimination: 'allThrows', clock: 'throws' };

/**
 * The game with what follows from its visits: as it is when that is there
 * already (worked out before), else replayed.
 */
export const withView = (type, game) => (!game || !REPLAY[type] || game[WORKED_OUT[type]] !== undefined ? game : viewOf(type, game));

/**
 * A game as the API answers with it: what is stored, with what follows from
 * the visits (so an older app, which reads the legs, still plays on).
 */
export const answerOf = (type, doc) => {
    if (!doc || !REPLAY[type]) return doc;
    const json = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
    const { _id, ...view } = viewOf(type, doc);
    return { ...view, id: json.id ?? _id };
};
