import { describe, expect, it } from 'vitest';
import { clockProgress, clockRematch, clockResults, newClockGame, replayClock, withClockState } from './clock.game';

const game = (throws, extra = {}) => ({ players: ['a', 'b'], mode: 'Double', skipAhead: false, throws, ...extra });
// a visit of three darts
const hit3 = [1, 1, 1];
const miss3 = [0, 0, 0];

describe('replayClock', () => {
    it('takes turns of three darts and moves on with every hit', () => {
        const state = replayClock(game([1, 0, 1]));
        expect(state.players.a).toMatchObject({ target: 2, darts: 3, hits: 2, visits: 1 });
        expect(state.current).toBe(1);
        expect(state.visit).toEqual([]);
    });

    it('completes the round once someone is done: the later players still throw', () => {
        // a hits everything: 21 darts in 7 visits; b misses everything
        const throws = [];
        for (let visit = 0; visit < 7; visit++) throws.push(...hit3, ...miss3);
        const before = replayClock(game(throws.slice(0, -3)));
        expect(before.players.a.finished).toBe(true);
        expect(before.lastRound).toBe(7);
        expect(before.done).toBe(false);
        expect(before.current).toBe(1);
        expect(replayClock(game(throws)).done).toBe(true);
    });

    it('ends right away when the last player in the order finishes', () => {
        // b finishes in the same round as a would: a already threw its 7th visit
        const throws = [];
        for (let visit = 0; visit < 7; visit++) throws.push(...miss3, ...hit3);
        expect(replayClock(game(throws)).done).toBe(true);
    });

    it('moves on two or three numbers with doubles and trebles when skipping ahead', () => {
        const state = replayClock(game([3, 2, 1], { mode: 'All', skipAhead: true }));
        expect(state.players.a.target).toBe(6);
        expect(state.players.a.perTarget.slice(0, 6)).toEqual([1, 0, 0, 1, 0, 1]);
    });

    it('never skips the bull', () => {
        // 19 with a treble goes to the bull, not past it
        const throws = [];
        for (let visit = 0; visit < 6; visit++) throws.push(...hit3, ...miss3);
        throws.push(3);
        const state = replayClock(game(throws, { mode: 'All', skipAhead: true }));
        expect(state.players.a.target).toBe(20);
        expect(state.players.a.finished).toBe(false);
    });

    it('ignores skipping ahead outside the mode where every ring counts', () => {
        expect(replayClock(game([3], { mode: 'Double', skipAhead: true })).players.a.target).toBe(1);
    });
});

describe('clockResults', () => {
    it('ranks the finished by darts, the others by how far they got', () => {
        const throws = [];
        for (let visit = 0; visit < 7; visit++) throws.push(...hit3, 1, 0, 0, 0, 0, 0);
        const state = replayClock({ players: ['a', 'b', 'c'], mode: 'All', throws });
        expect(state.done).toBe(true);
        expect(clockResults(state).map(({ playerId, rank, finished }) => [playerId, rank, finished]))
            .toEqual([['a', 1], ['b', 2], ['c', 3]].map(([id, rank]) => [id, rank, id === 'a']));
    });

    it('shares the win when two finish with the same darts', () => {
        const throws = [];
        for (let visit = 0; visit < 7; visit++) throws.push(...hit3, ...hit3);
        const results = clockResults(replayClock(game(throws)));
        expect(results.map(({ rank }) => rank)).toEqual([1, 1]);
    });

    it('lets fewer darts win when both finish in the same round', () => {
        // round 1: a misses all, b misses one; rounds 2–7 all hit; round 8: a finishes first, b still gets its turn
        const throws = [...miss3, 0, 1, 1];
        for (let round = 2; round <= 7; round++) throws.push(...hit3, ...hit3);
        throws.push(...hit3, 1);
        const state = replayClock(game(throws));
        expect(state.done).toBe(true);
        const results = clockResults(state);
        expect(results[0]).toMatchObject({ playerId: 'b', rank: 1, darts: 22, finished: true });
        expect(results[1]).toMatchObject({ playerId: 'a', rank: 2, darts: 24, finished: true });
    });
});

describe('withClockState', () => {
    it('marks the winners and ends the game', () => {
        const throws = [];
        for (let visit = 0; visit < 7; visit++) throws.push(...hit3, ...miss3);
        const saved = withClockState(game(throws));
        expect(saved).toMatchObject({ gameIsRunning: false, hasWinner: true });
        expect(saved.playerModels.a).toMatchObject({ hasWonGame: true, rank: 1, darts: 21, finished: true });
        expect(saved.playerModels.b).toMatchObject({ hasWonGame: false, rank: 2 });
    });

    it('starts a new game and its rematch with the turn of the first player', () => {
        const fresh = newClockGame({ players: ['a', 'b'], mode: 'All', skipAhead: true });
        expect(fresh).toMatchObject({ currentPlayerTurn: 'a', gameIsRunning: true, skipAhead: true, numberOfPlayers: 2 });
        expect(clockRematch(fresh, { switchPlayers: true }).players).toEqual(['b', 'a']);
        expect(newClockGame({ players: ['a', 'b'], mode: 'Double', skipAhead: true }).skipAhead).toBe(false);
    });
});

describe('clockProgress', () => {
    it('gives the numbers hit after every round, a finished player stays at 21', () => {
        const throws = [];
        for (let visit = 0; visit < 7; visit++) throws.push(...hit3, 1, 0, 0);
        const rows = clockProgress(game(throws));
        expect(rows).toHaveLength(8);
        expect(rows[0]).toEqual({ round: 0, a: 0, b: 0 });
        expect(rows[1]).toEqual({ round: 1, a: 3, b: 1 });
        expect(rows[7]).toEqual({ round: 7, a: 21, b: 7 });
    });
});
