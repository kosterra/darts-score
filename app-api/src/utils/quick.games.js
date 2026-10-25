/**
 * Quick games: X01, Cricket and Elimination on the public start page, without
 * an account. The players are only names; the game is kept apart from the
 * clubs for 30 days, and only the browser that started it (with its key)
 * plays on. A darts evening (see evenings.js) plays its games as quick games.
 */
import crypto from 'node:crypto';
import { viewOf } from './game.view.js';

export const QUICK_KINDS = ['x01', 'cricket', 'elimination'];
export const QUICK_KEEP_DAYS = 30;
// a game has up to four players; a darts evening up to eight, each with the same id in all its games
export const QUICK_PLAYER_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
// what a quick game may be set up as
export const QUICK_X01 = { startingScores: [301, 501], outModes: ['Double Out', 'Straight Out'], legs: [1, 3, 5] };
export const QUICK_CRICKET = { variants: ['Standard', 'Cut-throat'] };
export const QUICK_ELIMINATION = { targetScores: [301, 501], outModes: ['Double Out', 'Straight Out'] };
// a whole game of five legs between four players stays well below this
export const MAX_GAME_SIZE = 400 * 1024;
// a dart of a visit: a miss, a single, double or treble of 1–20, the outer bull or the bullseye
const DART = /^(0|[SDT]([1-9]|1\d|20)|[SD]25)$/;
export const NAME = /^[\p{L}\p{N}][\p{L}\p{N} '.-]{0,19}$/u;

export const newKey = () => crypto.randomBytes(24).toString('hex');
export const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');
export const keyMatches = (key, hash) => {
    if (!key || !hash) return false;
    const given = Buffer.from(hashKey(key), 'hex');
    const kept = Buffer.from(hash, 'hex');
    return given.length === kept.length && crypto.timingSafeEqual(given, kept);
};

/**
 * Why a quick game is not acceptable, or null. game: as the game page keeps it,
 * with quickPlayers [{ id, nickname }]. before: the game as saved, when it is
 * updated: its setup and players cannot change any more.
 */
export const quickGameError = (kind, game, before = null) => {
    if (!QUICK_KINDS.includes(kind)) return 'A quick game is X01, Cricket or Elimination.';
    if (!game || typeof game !== 'object' || Array.isArray(game)) return 'The game is missing.';
    if (JSON.stringify(game).length > MAX_GAME_SIZE) return 'The game is too large.';

    const players = game.players;
    if (!Array.isArray(players) || players.length < 1 || players.length > 4) return 'A quick game has 1 to 4 players.';
    if (new Set(players).size !== players.length || players.some(id => !QUICK_PLAYER_IDS.includes(id))) return 'The players of the game are not valid.';
    const names = game.quickPlayers;
    if (!Array.isArray(names) || names.length !== players.length) return 'Every player needs a name.';
    for (const id of players) {
        const name = names.find(player => player?.id === id)?.nickname;
        if (typeof name !== 'string' || !NAME.test(name.trim())) return 'A name has 1 to 20 letters or digits.';
    }
    if (new Set(names.map(player => player.nickname.trim().toLowerCase())).size !== names.length) return 'Every player needs a name of their own.';

    if (kind === 'x01') {
        if (!QUICK_X01.startingScores.includes(Number(game.startingScore))) return 'A quick X01 game starts at 301 or 501.';
        if (!QUICK_X01.outModes.includes(game.legOutMode) || game.legInMode !== 'Straight In') return 'A quick X01 game is Straight In, with Double Out or Straight Out.';
        if (Number(game.numberOfSets) !== 1 || !QUICK_X01.legs.includes(Number(game.numberOfLegs)) || game.legMode !== 'Best of') return 'A quick X01 game is best of 1, 3 or 5 legs.';
    } else if (kind === 'elimination') {
        if (!QUICK_ELIMINATION.targetScores.includes(Number(game.targetScore))) return 'A quick Elimination game goes to 301 or 501.';
        if (!QUICK_ELIMINATION.outModes.includes(game.gameOutMode) || game.gameInMode !== 'Straight In') return 'A quick Elimination game is Straight In, with Double Out or Straight Out.';
    } else if (!QUICK_CRICKET.variants.includes(game.variant)) {
        return 'A quick Cricket game is Standard or Cut-throat.';
    }
    if (game.flyingDarts !== 'off') return 'Quick games have no dart animation.';
    const visits = game.visits ?? [];
    if (!Array.isArray(visits)) return 'The visits of the game are not valid.';
    for (const visit of visits) {
        const darts = Array.isArray(visit?.darts) ? visit.darts.filter(dart => dart !== '') : null;
        if (!players.includes(visit?.player) || !darts || darts.length > 3 || !darts.every(dart => DART.test(String(dart)))) return 'The visits of the game are not valid.';
    }

    if (before) {
        const setup = ['startingScore', 'legOutMode', 'numberOfLegs', 'variant', 'targetScore', 'gameOutMode'];
        if (setup.some(key => String(before[key] ?? '') !== String(game[key] ?? ''))) return 'The setup of a game cannot change.';
        if (JSON.stringify(before.players) !== JSON.stringify(players)) return 'The players of a game cannot change.';
        if (JSON.stringify(before.quickPlayers) !== JSON.stringify(names)) return 'The names of the players cannot change.';
    }
    return null;
};

/**
 * The game without what the server keeps for itself, as the game page reads it.
 */
export const quickGameView = (doc) => ({
    // with the legs and visits worked out from the visits, as the game page reads them
    ...viewOf(doc.kind, doc.data),
    id: String(doc._id),
    quick: true,
    kind: doc.kind,
    // the darts evening it belongs to: its statistics lead back there
    evening: doc.evening ? String(doc.evening) : null,
    gameIsRunning: doc.gameIsRunning,
    hasWinner: doc.hasWinner,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});

// the winner's name, for the list of the global admins
export const winnerOf = (game) => {
    const id = Object.entries(game.playerModels ?? {}).find(([, model]) => model?.hasWonGame)?.[0];
    return id ? game.quickPlayers?.find(player => player.id === id)?.nickname ?? null : null;
};
