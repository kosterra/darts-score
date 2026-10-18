// Around the Clock with the fewest darts: the players take turns of three
// darts and tap Hit or Miss for every dart. A hit moves the player on to the
// next target; who hits the bull is done. The round ends when everybody is.

// 1 to 20 and the bull
export const TARGETS = 21;
export const DARTS_PER_VISIT = 3;

const PREFIX = { Single: 'S', Double: 'D', Triple: 'T', All: '' };
const BULL = { Single: 'Outer bull', Double: 'Bullseye', Triple: 'Bullseye', All: 'Bull' };

// e.g. "D7", "T20" or "Bullseye"
export const targetLabel = (index, mode) => index >= TARGETS - 1 ? BULL[mode] ?? 'Bull' : `${PREFIX[mode] ?? ''}${index + 1}`;

// the targets without the ring, for charts: "1" … "20", "Bull"
export const TARGET_NAMES = Array.from({ length: TARGETS }, (_, index) => index === TARGETS - 1 ? 'Bull' : String(index + 1));

export const newRound = (playerIds) => ({
    order: [...playerIds],
    current: 0,
    // the darts of the current visit: true for a hit
    visit: [],
    players: Object.fromEntries(playerIds.map(id => [id, { target: 0, darts: 0, perTarget: Array(TARGETS).fill(0), finished: false }])),
    // who is done, in the order they finished
    finished: [],
    done: false,
});

const nextPlayer = (round, from) => {
    for (let step = 1; step <= round.order.length; step++) {
        const index = (from + step) % round.order.length;
        if (!round.players[round.order[index]].finished) return index;
    }
    return from;
};

/**
 * The round after one more dart of the player whose turn it is.
 */
export const throwDart = (round, hit) => {
    if (round.done) return round;
    const id = round.order[round.current];
    const before = round.players[id];
    const perTarget = [...before.perTarget];
    perTarget[before.target] += 1;
    const target = before.target + (hit ? 1 : 0);
    const finished = target >= TARGETS;
    const player = { ...before, darts: before.darts + 1, perTarget, target, finished };
    const players = { ...round.players, [id]: player };
    const finishedIds = finished ? [...round.finished, id] : round.finished;
    const done = finishedIds.length === round.order.length;
    const visit = [...round.visit, hit];

    // the visit is over after three darts, or when the player is done
    if (done || finished || visit.length >= DARTS_PER_VISIT) {
        const next = { ...round, players, finished: finishedIds, done, visit: [] };
        return done ? next : { ...next, current: nextPlayer(next, round.current) };
    }
    return { ...round, players, visit };
};

/**
 * Everybody's result, fewest darts first; the same darts share a place.
 */
export const roundResults = (round) => round.order
    .map(id => ({ playerId: id, ...round.players[id] }))
    .filter(result => result.finished)
    .sort((a, b) => a.darts - b.darts || round.finished.indexOf(a.playerId) - round.finished.indexOf(b.playerId))
    .map((result, _, all) => ({
        playerId: result.playerId,
        darts: result.darts,
        perTarget: result.perTarget,
        hitRate: Math.round(TARGETS / result.darts * 100),
        rank: 1 + all.filter(other => other.darts < result.darts).length,
    }));

// the targets that cost the most darts, e.g. [{ index: 19, darts: 6 }]
export const hardestTargets = (perTarget, count = 2) => perTarget
    .map((darts, index) => ({ index, darts }))
    .filter(target => target.darts > 1)
    .sort((a, b) => b.darts - a.darts || a.index - b.index)
    .slice(0, count);
