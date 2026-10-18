import { describe, expect, it } from 'vitest';
import { hardestTargets, newRound, roundResults, targetLabel, throwDart, TARGETS } from './atc.darts';

const play = (round, darts) => darts.reduce((current, hit) => throwDart(current, hit), round);
const hits = (n) => Array(n).fill(true);

describe('targetLabel', () => {
    it('names the ring of the mode', () => {
        expect(targetLabel(6, 'Double')).toBe('D7');
        expect(targetLabel(19, 'Triple')).toBe('T20');
        expect(targetLabel(0, 'All')).toBe('1');
        expect(targetLabel(20, 'Single')).toBe('Outer bull');
        expect(targetLabel(20, 'Double')).toBe('Bullseye');
    });
});

describe('throwDart', () => {
    it('moves on with a hit and stays with a miss', () => {
        const round = play(newRound(['a']), [true, false]);
        expect(round.players.a).toMatchObject({ target: 1, darts: 2 });
        expect(round.players.a.perTarget.slice(0, 2)).toEqual([1, 1]);
        expect(round.visit).toEqual([true, false]);
    });

    it('passes the turn after three darts', () => {
        const round = play(newRound(['a', 'b']), [false, false, false]);
        expect(round.current).toBe(1);
        expect(round.visit).toEqual([]);
    });

    it('ends a visit when the player is done, and skips them afterwards', () => {
        // a needs 21 hits: seven full visits, b misses in between
        let round = newRound(['a', 'b']);
        for (let visit = 0; visit < 7; visit++) round = play(round, [...hits(3), false, false, false]);
        expect(round.players.a.finished).toBe(true);
        expect(round.current).toBe(1);
        round = play(round, [false, false, false]);
        expect(round.current).toBe(1);
    });

    it('ends the round when everybody is done', () => {
        const round = play(newRound(['a']), hits(TARGETS));
        expect(round.done).toBe(true);
        expect(throwDart(round, true)).toBe(round);
    });
});

describe('roundResults', () => {
    it('ranks by fewest darts, the same darts share a place', () => {
        let round = newRound(['a', 'b', 'c']);
        // every visit: a hits all, b hits all, c misses one each visit
        while (!round.done) {
            const id = round.order[round.current];
            const hit = id !== 'c' || round.visit.length !== 0;
            round = throwDart(round, hit);
        }
        const results = roundResults(round);
        expect(results.map(result => [result.playerId, result.darts, result.rank])).toEqual([['a', 21, 1], ['b', 21, 1], ['c', 32, 3]]);
        expect(results[0].hitRate).toBe(100);
    });
});

describe('hardestTargets', () => {
    it('lists the targets that cost the most darts', () => {
        const perTarget = [1, 4, 1, 6, ...Array(17).fill(1)];
        expect(hardestTargets(perTarget)).toEqual([{ index: 3, darts: 6 }, { index: 1, darts: 4 }]);
        expect(hardestTargets(Array(21).fill(1))).toEqual([]);
    });
});
