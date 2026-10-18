import { describe, it, expect } from 'vitest';
import { x01VisitMoment } from './x01.moments';

const game = { startingScore: 501 };
const base = { game, playerId: 'a', legThrows: [], won: false, busted: false };

describe('x01VisitMoment', () => {
    it('knows the nine-darter before every other finish', () => {
        const legThrows = [
            { playerId: 'a', darts: ['T20', 'T20', 'T20'] },
            { playerId: 'a', darts: ['T20', 'T20', 'T20'] },
            { playerId: 'a', darts: ['T20', 'T19', 'D12'] },
        ];
        expect(x01VisitMoment({ ...base, darts: ['T20', 'T19', 'D12'], roundScore: 141, legThrows, won: true })).toEqual({ kind: 'nineDarter' });
        expect(x01VisitMoment({ ...base, game: { startingScore: 301 }, darts: ['T20', 'T19', 'D12'], roundScore: 141, legThrows, won: true }).kind).toBe('checkout');
    });

    it('knows the big fish, the bull finish and a high finish', () => {
        expect(x01VisitMoment({ ...base, darts: ['T20', 'T20', 'D25'], roundScore: 170, won: true }).kind).toBe('bigFish');
        expect(x01VisitMoment({ ...base, darts: ['S10', 'D25'], roundScore: 60, won: true })).toEqual({ kind: 'bull', checkout: 60 });
        expect(x01VisitMoment({ ...base, darts: ['T20', 'S1', 'D20'], roundScore: 101, won: true })).toEqual({ kind: 'checkout', checkout: 101 });
        expect(x01VisitMoment({ ...base, darts: ['S20', 'D20'], roundScore: 60, won: true })).toBeNull();
    });

    it('knows the 180 and bed and breakfast, but nothing in a bust', () => {
        expect(x01VisitMoment({ ...base, darts: ['T20', 'T20', 'T20'], roundScore: 180 }).kind).toBe('oneEighty');
        expect(x01VisitMoment({ ...base, darts: ['S5', 'S20', 'S1'], roundScore: 26 }).kind).toBe('bedAndBreakfast');
        expect(x01VisitMoment({ ...base, darts: ['T20', 'T20', 'T20'], roundScore: 180, busted: true })).toBeNull();
    });
});
