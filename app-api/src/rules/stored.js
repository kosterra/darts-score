/**
 * X01 (and the trainings against the bot), Cricket, Elimination and Around the
 * Clock as they are stored: their settings, players and visits, with the
 * results worked out from the visits (the player models, whose turn it is,
 * whether it is over). Everything else follows from the visits.
 *
 * No texts and no React here: the API keeps a copy of this file.
 */
import { replayX01 } from './x01.js';
import { replayCricket } from './cricket.js';
import { replayElimination } from './elimination.js';
import { replayClockGame } from './clock.js';

export const REPLAY = { x01: replayX01, x01training: replayX01, cricket: replayCricket, elimination: replayElimination, clock: replayClockGame };

// what a game shows that follows from its visits alone and is not stored
export const DERIVED = {
    x01: ['allSetsThrows', 'currentLegThrows', 'currentThrow', 'currentSet', 'currentSetLeg', 'setsPlayed', 'legsPlayed', 'startingPlayerLeg', 'startingPlayerSet'],
    cricket: ['allThrows', 'currentThrow'],
    elimination: ['allThrows', 'currentThrow', 'startingPlayer'],
    clock: ['throws'],
};
DERIVED.x01training = DERIVED.x01;

// the whole game, as the screens and statistics read it, from what is stored
export const gameOf = (type, stored) => REPLAY[type](stored);

// what is stored of a game: without what follows from its visits
export const storedOf = (type, game) => Object.fromEntries(Object.entries(game).filter(([key]) => !(DERIVED[type] ?? []).includes(key)));
