import { clockResults as resultsOf, clockStep, clockVisits, newClockState, replayClockGame, skipsAhead as skips } from '../rules/clock';

// Around the Clock as a game, played on the rules engine (rules/clock.js). The
// screens work with the value of every dart ("throws"): 0 a miss, 1 a hit; with
// skipAhead (every ring counting) 1 a single, 2 a double and 3 a treble, which
// move on as many numbers. The game is stored as the fields hit, its visits.

// whether a double moves on two numbers and a treble three
export const skipsAhead = skips;

/**
 * The state of the game after all its darts: whose turn it is, the darts of
 * the current visit, every player's progress, whether this is the last round
 * and whether the game is over.
 */
export const replayClock = (game) => {
    const state = newClockState(game, game.players);
    for (const value of game.throws ?? []) {
        if (state.done) break;
        clockStep(state, value);
    }
    return state;
};

/**
 * Everybody's place once the game is over: who finished first by darts, then
 * the others by how far they got. The same result shares a place; the 1st are
 * the winners.
 */
export const clockResults = resultsOf;

/**
 * The game after its darts ("throws"): its visits, the player models and turn
 * brought up to date, ready to be saved; over when everybody had their turns.
 */
export const withClockState = (game) => replayClockGame({ ...game, visits: clockVisits(game, game.throws ?? []) });

// a new game: the players in throwing order, no darts yet
export const newClockGame = ({ players, mode, skipAhead = false }) => withClockState({
    isSoloGame: false,
    numberOfPlayers: players.length,
    players: [...players],
    mode,
    skipAhead: Boolean(skipAhead) && mode === 'All',
    throws: [],
});

/**
 * A new game with the settings and players of "game": in the same order, the
 * other way round (switchPlayers) or shuffled (shuffle).
 */
export const clockRematch = (game, { switchPlayers = false, shuffle = false, random = Math.random } = {}) => {
    let players = [...game.players];
    if (switchPlayers) players.reverse();
    else if (shuffle) {
        for (let index = players.length - 1; index > 0; index--) {
            const other = Math.floor(random() * (index + 1));
            [players[index], players[other]] = [players[other], players[index]];
        }
    }
    return newClockGame({ players, mode: game.mode, skipAhead: game.skipAhead });
};

/**
 * How far each player got after every round, for a chart: [{ round, [playerId]: numbers hit }]
 * from round 0; a player who is done stays at 21.
 */
export const clockProgress = (game) => {
    // each player's numbers hit after each of their turns
    const afterTurn = Object.fromEntries(game.players.map(id => [id, [0]]));
    const throws = game.throws ?? [];
    for (let count = 1; count <= throws.length; count++) {
        const state = replayClock({ ...game, throws: throws.slice(0, count) });
        for (const id of state.order) {
            const { visits, target } = state.players[id];
            if (visits === afterTurn[id].length) afterTurn[id].push(target);
        }
    }
    const rounds = Math.max(...game.players.map(id => afterTurn[id].length - 1));
    return Array.from({ length: rounds + 1 }, (_, round) => ({
        round,
        ...Object.fromEntries(game.players.map(id => [id, afterTurn[id][Math.min(round, afterTurn[id].length - 1)]])),
    }));
};
