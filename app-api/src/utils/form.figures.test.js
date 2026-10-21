import { describe, it, expect } from 'vitest';
import { formFigures } from './form.figures.js';

const v = (playerId, darts, roundScore, scoreLeft) => ({ playerId, darts, roundScore, scoreLeft });
const game = (legs, checkout = { hit: 1, total: 3 }) => ({
    allSetsThrows: { 'set-1': Object.fromEntries(legs.map((leg, i) => [`leg-${i + 1}`, leg])) },
    playerModels: { p1: { checkout: { game: checkout } } },
});

describe('form figures', () => {
    it('counts the scoring visits, the darts of the won legs and the first nine', () => {
        const won = [
            v('p1', ['T20', 'T20', 'T20'], 180, 321), v('p2', ['S1', 'S1', 'S1'], 3, 498),
            v('p1', ['S20', 'S5', 'S1'], 26, 295), v('p2', ['S1', 'S1', 'S1'], 3, 495),
            v('p1', ['T20', 'S20', 'S20'], 100, 195), v('p2', ['S1', 'S1', 'S1'], 3, 492),
            v('p1', ['S5', 'S1', 'S1'], 7, 188),
            v('p1', ['T20', 'T20', 'S8'], 128, 60),
            // on the way to the finish: no scoring visit
            v('p1', ['S20', 'D20'], 60, 0),
        ];
        const lost = [
            v('p2', ['T20'], 60, 441),
            v('p1', ['S20', 'S20', 'S5'], 45, 456),
            // a bust: the darts scored, the visit did not
            v('p1', ['T20', 'T20', 'T20'], 0, 456),
        ];
        const figures = formFigures([game([won, lost])], 'p1');
        expect(figures).toMatchObject({
            games: 1, visits: 8, checkoutRate: 33.3, checkoutHits: 1, checkoutAttempts: 3,
            legsWon: 1, dartsPerLeg: 17, oneEighties: 1,
        });
        // scoring visits: 180, 26, 100, 7, 128, 45
        expect(figures.tonPlus).toBe(50);
        expect(figures.under10).toBe(16.7);
        expect(figures.under30).toBe(33.3);
        expect(figures.under50).toBe(50);
        // first three visits of each leg: 180, 26, 100 and 45, 0
        expect(figures.firstNine).toBe(70.2);
    });

    it('has no rates without games', () => {
        expect(formFigures([], 'p1')).toMatchObject({ games: 0, checkoutRate: null, tonPlus: null, dartsPerLeg: null, firstNine: null });
    });
});
