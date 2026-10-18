import { useCallback, useEffect, useRef, useState } from 'react';

import { DARTS_PER_VISIT } from './atc.darts';

/**
 * The big moment of the last dart in Around the Clock, from how the round
 * changed: the player whose darts went up by one threw it.
 * { kind: 'strike' (finished the round), 'leap' (a treble jumping three
 * numbers ahead), 'roll' (three targets hit in one visit), name,
 * playerIndex, from, to, darts } or null.
 */
export const clockDartMoment = (before, after, streak, { rings = false } = {}) => {
    if (!before || !after) return null;
    const id = after.order.find(playerId => after.players[playerId]?.darts === (before.players[playerId]?.darts ?? 0) + 1);
    if (!id) return null;
    const was = before.players[id];
    const now = after.players[id];
    const finishedNow = now.finished && !was.finished;
    const step = finishedNow ? 1 : now.target - was.target;
    if (finishedNow) return { kind: 'strike', playerId: id, darts: now.darts };
    if (rings && step >= 3) return { kind: 'leap', playerId: id, from: was.target, to: now.target };
    if (streak.playerId === id && streak.darts === DARTS_PER_VISIT && streak.hits === DARTS_PER_VISIT) {
        return { kind: 'roll', playerId: id, from: now.target - DARTS_PER_VISIT, to: now.target };
    }
    return null;
};

/**
 * Follows a round of Around the Clock (the game or the training) and returns
 * the big moment of the last dart while it plays: [moment, end].
 * nameOf(id), indexOf(id): the player's nickname and place in the game.
 */
const useClockMoment = (round, { nameOf, indexOf, rings = false }) => {
    const [moment, setMoment] = useState(null);
    const end = useCallback(() => setMoment(null), []);
    const previous = useRef(round);
    // the darts of the visit so far: { playerId, darts, hits }
    const streak = useRef({ playerId: null, darts: 0, hits: 0 });

    useEffect(() => {
        const before = previous.current;
        previous.current = round;
        if (!before || !round || before === round) return;
        const id = round.order.find(playerId => round.players[playerId]?.darts === (before.players[playerId]?.darts ?? 0) + 1);
        // an undo, or a new round: start counting again
        if (!id) {
            streak.current = { playerId: null, darts: 0, hits: 0 };
            return;
        }
        const was = before.players[id];
        const now = round.players[id];
        const hit = now.target > was.target || (now.finished && !was.finished);
        if (streak.current.playerId !== id || streak.current.darts >= DARTS_PER_VISIT) streak.current = { playerId: id, darts: 0, hits: 0 };
        streak.current = { playerId: id, darts: streak.current.darts + 1, hits: streak.current.hits + (hit ? 1 : 0) };

        const found = clockDartMoment(before, round, streak.current, { rings });
        if (found) setMoment({ ...found, key: Date.now(), name: nameOf(id), playerIndex: indexOf(id) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round]);

    return [moment, end];
};

export default useClockMoment;
