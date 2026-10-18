import { describe, it, expect } from 'vitest';
import { clockDartMoment } from './use.clock.moment';

const round = (players) => ({ order: Object.keys(players), players });
const p = (target, darts, finished = false) => ({ target, darts, finished });

describe('clockDartMoment', () => {
    it('strikes twelve when a player finishes', () => {
        expect(clockDartMoment(round({ a: p(20, 30) }), round({ a: p(21, 31, true) }), {})).toMatchObject({ kind: 'strike', darts: 31 });
    });

    it('leaps with a treble that jumps three numbers, only with rings', () => {
        expect(clockDartMoment(round({ a: p(6, 9) }), round({ a: p(9, 10) }), {}, { rings: true })).toMatchObject({ kind: 'leap', from: 6, to: 9 });
        expect(clockDartMoment(round({ a: p(6, 9) }), round({ a: p(9, 10) }), {}, { rings: false })).toBeNull();
    });

    it('is on a roll after three hits in one visit', () => {
        const before = round({ a: p(8, 8), b: p(3, 6) });
        const after = round({ a: p(9, 9), b: p(3, 6) });
        expect(clockDartMoment(before, after, { playerId: 'a', darts: 3, hits: 3 })).toMatchObject({ kind: 'roll', from: 6, to: 9 });
        expect(clockDartMoment(before, after, { playerId: 'a', darts: 3, hits: 2 })).toBeNull();
    });

    it('finds nothing for an undo', () => {
        expect(clockDartMoment(round({ a: p(9, 9) }), round({ a: p(8, 8) }), {})).toBeNull();
    });
});
