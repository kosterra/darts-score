import { parseDart } from '../rules/darts.js';
import { clockVisits } from '../rules/clock.js';

/**
 * Games as the app stored them before they were kept as visits: X01 with its
 * legs ("allSetsThrows" and "currentLegThrows"), Cricket and Elimination with
 * "allThrows", Around the Clock with the values of its darts ("throws").
 * Used by the migration to visits, and for a game an older app (still open
 * in a browser) sends.
 */

const number = (key) => Number(String(key).replace(/\D/g, '')) || 0;

// a dart as the rules read it: 'T20', 'D25', 'S5', '0' (what is not on the board counts as a miss)
const field = (dart) => parseDart(dart).field;
const visitOf = (visit) => ({
    player: visit?.playerId,
    darts: (Array.isArray(visit?.darts) ? visit.darts : []).filter(dart => dart !== '' && dart != null).map(field),
});

// an older app sends its game with these (the app of today only the visits): they are what it played
export const isLegacy = (type, game) => {
    if (!game) return false;
    if (type === 'x01' || type === 'x01training') return game.allSetsThrows !== undefined || Array.isArray(game.currentLegThrows);
    if (type === 'cricket' || type === 'elimination') return Array.isArray(game.allThrows);
    if (type === 'clock') return Array.isArray(game.throws);
    return false;
};

/**
 * The visits of a game stored the old way, in the order they were thrown.
 */
export const legacyVisits = (type, game) => {
    if (type === 'x01' || type === 'x01training') {
        const legs = Object.entries(game.allSetsThrows ?? {})
            .sort(([a], [b]) => number(a) - number(b))
            .flatMap(([, set]) => Object.entries(set ?? {}).sort(([a], [b]) => number(a) - number(b)).map(([, leg]) => leg))
            .filter(Array.isArray);
        return [...legs.flat(), ...(game.currentLegThrows ?? [])].filter(visit => visit?.playerId).map(visitOf);
    }
    if (type === 'cricket' || type === 'elimination') return (game.allThrows ?? []).filter(visit => visit?.playerId).map(visitOf);
    if (type === 'clock') return clockVisits(game, game.throws ?? []);
    return [];
};

// X01: the players' own rules of a handicap, kept in their player models before
export const legacyHandicap = (game) => {
    const own = Object.fromEntries((game.players ?? [])
        .map(id => [id, game.playerModels?.[id]])
        .filter(([, model]) => model && (model.startingScore != null || model.legInMode != null || model.legOutMode != null))
        .map(([id, model]) => [id, {
            startingScore: Number(model.startingScore ?? game.startingScore),
            legInMode: model.legInMode ?? game.legInMode,
            legOutMode: model.legOutMode ?? game.legOutMode,
        }]));
    return Object.keys(own).length ? own : null;
};

// who threw first, when it was not the first player (earlier versions of the app let others start)
export const legacyStarter = (game, visits) => {
    const first = visits[0]?.player;
    return first && first !== game.players?.[0] && game.players?.includes(first) ? first : null;
};
