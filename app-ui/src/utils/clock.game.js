import { DARTS_PER_VISIT, TARGETS } from './atc.darts';

// Around the Clock as a game. The players take turns of three darts at 1 to 20
// and the bull. The first to finish wins, but the round is completed, so
// everyone has had as many turns; finished in the same round, fewer darts win.
// The others are placed by how far they got. The whole game follows from the
// list of darts ("throws"): 0 a miss, 1 a hit; with skipAhead (every ring
// counting) 1 a single, 2 a double and 3 a treble, which move on as many numbers.

const BULL = TARGETS - 1;

// whether a double moves on two numbers and a treble three
export const skipsAhead = (game) => Boolean(game.skipAhead) && game.mode === 'All';

const newPlayer = () => ({ target: 0, darts: 0, hits: 0, perTarget: Array(TARGETS).fill(0), finished: false, visits: 0 });

/**
 * The state of the game after all its darts: whose turn it is, the darts of
 * the current visit, every player's progress, whether this is the last round
 * and whether the game is over.
 */
export const replayClock = (game) => {
    const order = [...game.players];
    const players = Object.fromEntries(order.map(id => [id, newPlayer()]));
    const finished = [];
    const skip = skipsAhead(game);
    let current = 0;
    let visit = [];
    // once someone is done, the turns everyone gets
    let lastRound = null;
    let done = false;

    const hasTurnLeft = (id) => !players[id].finished && (lastRound === null || players[id].visits < lastRound);
    const nextPlayer = () => {
        for (let step = 1; step <= order.length; step++) {
            const index = (current + step) % order.length;
            if (hasTurnLeft(order[index])) return index;
        }
        return null;
    };

    for (const value of game.throws ?? []) {
        if (done) break;
        const id = order[current];
        const player = players[id];
        player.darts += 1;
        player.perTarget[player.target] += 1;
        if (value > 0) {
            player.hits += 1;
            if (player.target === BULL) player.finished = true;
            else player.target = Math.min(BULL, player.target + (skip ? value : 1));
        }
        if (player.finished) {
            player.target = TARGETS;
            finished.push(id);
        }
        visit = [...visit, value];

        if (player.finished || visit.length >= DARTS_PER_VISIT) {
            player.visits += 1;
            if (player.finished && lastRound === null) lastRound = player.visits;
            visit = [];
            const next = nextPlayer();
            if (next === null) done = true;
            else current = next;
        }
    }

    return { order, current, visit, players, finished, lastRound, done };
};

/**
 * Everybody's place once the game is over: who finished first by darts, then
 * the others by how far they got. The same result shares a place; the 1st are
 * the winners.
 */
export const clockResults = (state) => {
    const key = (id) => {
        const player = state.players[id];
        // finished before unfinished, fewer darts, further on
        return [player.finished ? 0 : 1, player.finished ? player.darts : -player.target, player.darts];
    };
    const compare = (a, b) => {
        const [x, y] = [key(a), key(b)];
        return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    };
    const sorted = [...state.order].sort((a, b) => compare(a, b) || state.order.indexOf(a) - state.order.indexOf(b));
    let rank = 0;
    return sorted.map((id, index) => {
        if (index === 0 || compare(id, sorted[index - 1]) !== 0) rank = index + 1;
        const player = state.players[id];
        return {
            playerId: id,
            rank,
            darts: player.darts,
            hits: player.hits,
            hitRate: player.darts ? Math.round(player.hits / player.darts * 100) : 0,
            target: player.target,
            finished: player.finished,
            perTarget: player.perTarget,
        };
    });
};

/**
 * The game with its player models and turn brought up to date from the darts,
 * ready to be saved; over when everybody had their turns.
 */
export const withClockState = (game) => {
    const state = replayClock(game);
    const results = state.done ? new Map(clockResults(state).map(result => [result.playerId, result])) : null;
    return {
        ...game,
        currentPlayerTurn: state.order[state.current],
        gameIsRunning: !state.done,
        hasWinner: state.done,
        playerModels: Object.fromEntries(state.order.map(id => {
            const { visits, ...player } = state.players[id];
            const result = results?.get(id);
            return [id, { ...player, visits, ...(result && { rank: result.rank, hasWonGame: result.rank === 1 }) }];
        })),
    };
};

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
