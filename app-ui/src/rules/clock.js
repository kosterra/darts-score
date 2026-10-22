/**
 * Around the Clock as a game for the rules engine. The players take turns of
 * three darts at 1 to 20 and the bull. The first to finish wins, but the round
 * is completed, so everyone has had as many turns; finished in the same round,
 * fewer darts win. The others are placed by how far they got.
 *
 * A dart is stored as the field it hit ('S7', 'D20', 'S25', '0'). What counts
 * follows from the mode: in Single, Double or Triple only that ring of the
 * target moves on, in All any ring; with "skipAhead" (in All) a double moves on
 * two numbers and a treble three. The screens work with the value of each dart
 * (0 a miss, 1 a hit, or 1–3 with skipAhead), "throws": clockThrows and
 * clockVisits turn one into the other.
 *
 * No texts and no React here: the API keeps a copy of this file.
 */
import { DARTS_PER_VISIT, replayGame } from './engine.js';

// 1 to 20 and the bull
export const TARGETS = 21;
const BULL = TARGETS - 1;
const RING = { Single: 'S', Double: 'D', Triple: 'T' };

export const CLOCK_SETTINGS = ['mode', 'skipAhead'];

// whether a double moves on two numbers and a treble three
export const skipsAhead = (game) => Boolean(game.skipAhead) && game.mode === 'All';

const numberOf = (target) => (target >= BULL ? 25 : target + 1);

/**
 * The value of a dart at the target: 0 when it does not count, else 1 (with
 * skipAhead 1–3, the bull 1 or 2).
 */
export const valueOfDart = (field, target, game) => {
    const value = String(field ?? '').toUpperCase();
    const match = value.match(/^([SDT])(\d{1,2})$/);
    if (!match || Number(match[2]) !== numberOf(target)) return 0;
    const ring = match[1];
    if (game.mode === 'All') return skipsAhead(game) ? { S: 1, D: 2, T: 3 }[ring] : 1;
    // the bull has no treble: Double and Triple end on the bullseye, Single on the outer bull
    if (target >= BULL) return ring === (game.mode === 'Single' ? 'S' : 'D') ? 1 : 0;
    return ring === RING[game.mode] ? 1 : 0;
};

// the field of a dart of that value at the target
export const dartOfValue = (value, target, game) => {
    if (!value) return '0';
    const number = numberOf(target);
    // the bull has no treble: a treble there is kept as the bullseye
    if (game.mode === 'All' && target >= BULL) return skipsAhead(game) && value > 1 ? 'D25' : 'S25';
    if (game.mode === 'All') return `${skipsAhead(game) ? ['S', 'S', 'D', 'T'][value] : 'S'}${number}`;
    if (target >= BULL) return game.mode === 'Single' ? 'S25' : 'D25';
    return `${RING[game.mode]}${number}`;
};

const newPlayer = () => ({ target: 0, darts: 0, hits: 0, perTarget: Array(TARGETS).fill(0), finished: false, visits: 0 });

export const newClockState = (settings, players) => ({
    mode: settings.mode,
    skipAhead: Boolean(settings.skipAhead) && settings.mode === 'All',
    order: [...players],
    current: 0,
    visit: [],
    players: Object.fromEntries(players.map(id => [id, newPlayer()])),
    finished: [],
    // once someone is done, the turns everyone gets
    lastRound: null,
    done: false,
    throws: [],
});

/**
 * The game after one more dart (its value) of the player at the oche.
 * Changes "state" itself.
 */
export const clockStep = (state, value) => {
    if (state.done) return state;
    const { order, players } = state;
    const skip = skipsAhead(state);
    const id = order[state.current];
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
        state.finished.push(id);
    }
    state.visit = [...state.visit, value];
    state.throws = [...state.throws, value];

    if (player.finished || state.visit.length >= DARTS_PER_VISIT) {
        player.visits += 1;
        if (player.finished && state.lastRound === null) state.lastRound = player.visits;
        state.visit = [];
        const hasTurnLeft = (other) => !players[other].finished && (state.lastRound === null || players[other].visits < state.lastRound);
        let next = null;
        for (let step = 1; step <= order.length; step++) {
            const index = (state.current + step) % order.length;
            if (hasTurnLeft(order[index])) { next = index; break; }
        }
        if (next === null) state.done = true;
        else state.current = next;
    }
    return state;
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

export const CLOCK = {
    id: 'clock',
    minPlayers: 1,
    maxPlayers: 4,
    init: (settings, players) => newClockState(settings, players),
    visit: (state, id, darts) => {
        for (const dart of darts) {
            if (state.done) break;
            const player = state.players[state.order[state.current]];
            clockStep(state, valueOfDart(dart.field ?? dart, player.target, state));
        }
        return state;
    },
    current: (state) => (state.done ? null : state.order[state.current]),
    over: (state) => state.done,
    score: (player) => (player.finished ? 1000 - player.darts : player.target),
};

/**
 * The visits of a game from the values of its darts: each player's darts at
 * their targets, as they were thrown; the last visit may still be going on.
 */
export const clockVisits = (game, throws) => {
    const state = newClockState(game, game.players);
    const visits = [];
    let open = null;
    for (const value of throws ?? []) {
        if (state.done) break;
        const id = state.order[state.current];
        const field = dartOfValue(value, state.players[id].target, state);
        if (!open || open.player !== id || open.darts.length >= DARTS_PER_VISIT) {
            open = { player: id, darts: [] };
            visits.push(open);
        }
        open.darts.push(field);
        clockStep(state, value);
        if (state.visit.length === 0) open = null;
    }
    return visits;
};

// the values of the darts of the visits
export const clockThrows = (game, visits) => replayGame(CLOCK, { players: game.players, settings: { mode: game.mode, skipAhead: game.skipAhead }, visits }).state.throws;

/**
 * The player models and turn of the game: every player's progress, and once
 * it is over their place.
 */
export const clockModels = (state) => {
    const results = state.done ? new Map(clockResults(state).map(result => [result.playerId, result])) : null;
    return Object.fromEntries(state.order.map(id => {
        const { visits, ...player } = state.players[id];
        const result = results?.get(id);
        return [id, { ...player, visits, ...(result && { rank: result.rank, hasWonGame: result.rank === 1 }) }];
    }));
};

// the whole game from what is stored ({ mode, skipAhead, players, visits, … })
export const replayClockGame = (stored) => {
    const { state } = replayGame(CLOCK, { players: stored.players, settings: { mode: stored.mode, skipAhead: stored.skipAhead }, visits: stored.visits ?? [] });
    return {
        ...stored,
        skipAhead: skipsAhead(stored),
        visits: stored.visits ?? [],
        throws: state.throws,
        currentPlayerTurn: state.order[state.current],
        gameIsRunning: !state.done,
        hasWinner: state.done,
        playerModels: clockModels(state),
    };
};
