import { describe, expect, it } from 'vitest';
import { hitRatePoints, usualHitRate } from './hit.rate';
import { BULLS, DOUBLES_AROUND, TREBLES } from '../rules/trainings';

describe('hitRatePoints', () => {
    it('the treble rate after every dart: only a treble of the number is a hit', () => {
        const rates = hitRatePoints(TREBLES, ['T20', 'S20', 'T19', 'T20'], { number: 20, darts: 30 }).map(point => point.score);
        expect(rates).toEqual([100, 50, 33.3, 50]);
    });

    it('the bullseye and the outer bull both hit the bull', () => {
        expect(hitRatePoints(BULLS, ['D25', 'S25', '0', '0'], { darts: 30 }).map(point => point.score)).toEqual([100, 100, 66.7, 50]);
    });

    it('a hit-or-miss training: H is a hit', () => {
        expect(hitRatePoints(DOUBLES_AROUND, ['M', 'M', 'H'], {}).map(point => point.score)).toEqual([0, 0, 33.3]);
    });

    it('below the usual rate amber, at or above it green; the first visit and without a usual rate green', () => {
        const darts = ['0', '0', 'T20', '0', 'T20', 'T20'];
        expect(hitRatePoints(TREBLES, darts, { number: 20 }, 40).map(point => point.risk)).toEqual(['safe', 'safe', 'warn', 'warn', 'safe', 'safe']);
        expect(hitRatePoints(TREBLES, darts, { number: 20 }).every(point => point.risk === 'safe')).toBe(true);
    });
});

describe('usualHitRate', () => {
    const entry = (player, darts, createdAt, settings = { number: 20, darts: 30 }) => ({ player: { id: player }, darts, settings, createdAt });

    it('the average of the player\'s latest ten attempts with the same settings', () => {
        const entries = [
            entry('p1', ['T20', '0'], '2026-01-01'),
            entry('p1', ['T20', 'T20', '0', '0'], '2026-01-02'),
            // another player, another treble: not counted
            entry('p2', ['T20'], '2026-01-03'),
            entry('p1', ['T19'], '2026-01-04', { number: 19, darts: 30 }),
            // older than the ten latest: not counted
            ...Array.from({ length: 9 }, (_, index) => entry('p1', ['0'], `2025-0${index + 1}-01`)),
        ];
        // 50 %, 50 % and eight older ones at 0 %
        expect(usualHitRate(TREBLES, entries, 'p1', { number: 20, darts: 30 })).toBe(10);
    });

    it('none without an attempt', () => {
        expect(usualHitRate(BULLS, [], 'p1', { darts: 30 })).toBeNull();
        expect(usualHitRate(BULLS, null, 'p1', { darts: 30 })).toBeNull();
    });
});
