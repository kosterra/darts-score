import { describe, it, expect } from 'vitest';
import { formFigures } from './form.figures.js';

const v = (playerId, darts, roundScore, scoreLeft) => ({ playerId, darts, roundScore, scoreLeft });
const game = (legs, checkout = { hit: 1, total: 3 }) => ({
    startingScore: 501,
    players: ['p1', 'p2'],
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
            // a bust: the darts scored, the visit did not (it keeps their points, the score stays)
            v('p1', ['T20', 'T20', 'T20'], 180, 456),
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
        // darts of the visits with more than 100 left (the bust too): 21, of them S5 S1, S5 S1 S1 and S5 in the 1 or 5
        expect(figures.oneOrFive).toBe(28.6);
        // first three visits of each leg: 180, 26, 100 and 45, 0
        expect(figures.firstNine).toBe(70.2);
    });

    it('has no rates without games', () => {
        expect(formFigures([], 'p1')).toMatchObject({ games: 0, checkoutRate: null, tonPlus: null, oneOrFive: null, dartsPerLeg: null, firstNine: null });
    });

    it('counts only the darts thrown, not the empty places after a checkout', () => {
        const leg = [
            v('p1', ['T20', 'T20', 'T20'], 180, 321), v('p2', ['S1', 'S1', 'S1'], 3, 498),
            v('p1', ['T20', 'T20', 'T20'], 180, 141), v('p2', ['S1', 'S1', 'S1'], 3, 495),
            v('p1', ['T20', 'T19', 'D12'], 141, 0),
        ];
        const short = [
            v('p1', ['T20', 'T20', 'T20'], 180, 321), v('p2', ['S1', 'S1', 'S1'], 3, 498),
            v('p1', ['T20', 'T20', 'T20'], 180, 141), v('p2', ['S1', 'S1', 'S1'], 3, 495),
            v('p1', ['T20', 'T20', 'S1'], 121, 20), v('p2', ['S1', 'S1', 'S1'], 3, 492),
            // the winning visit padded as it is stored
            v('p1', ['D10', '', ''], 20, 0),
        ];
        expect(formFigures([game([leg, short])], 'p1')).toMatchObject({ legsWon: 2, dartsPerLeg: 9.5 });
    });

    it('leaves busts out of the 180s and the first nine', () => {
        const leg = [
            v('p1', ['T20', 'T20', 'T20'], 180, 321), v('p2', ['S1', 'S1', 'S1'], 3, 498),
            v('p1', ['T20', 'T20', 'T20'], 180, 141), v('p2', ['S1', 'S1', 'S1'], 3, 495),
            v('p1', ['T20', 'T20', 'T20'], 180, 141), v('p2', ['S1', 'S1', 'S1'], 3, 492),
        ];
        const figures = formFigures([{ ...game([leg]), roundLimit: 3 }], 'p1');
        // two 180s; the third visit busted (it scored nothing): (180 + 180 + 0) / 3
        expect(figures).toMatchObject({ oneEighties: 2, firstNine: 120 });
    });

    it('counts a leg won by the round limit as won, without darts per leg', () => {
        const leg = [
            v('p1', ['T20', 'T20', 'T20'], 180, 321), v('p2', ['S1', 'S1', 'S1'], 3, 498),
        ];
        const won = formFigures([{ ...game([leg]), roundLimit: 1 }], 'p1');
        expect(won).toMatchObject({ legsWon: 1, dartsPerLeg: null });
        expect(formFigures([{ ...game([leg]), roundLimit: 1 }], 'p2').legsWon).toBe(0);
    });

    it('counts a leg the partner won in doubles, without darts per leg', () => {
        const leg = [
            v('a1', ['T20', 'T20', 'T20'], 180, 321), v('b1', ['S1', 'S1', 'S1'], 3, 498),
            v('a2', ['T20', 'T20', 'T20'], 180, 141), v('b2', ['S1', 'S1', 'S1'], 3, 495),
            v('a1', ['T20', 'T19', 'D12'], 141, 0),
        ];
        const doubles = { startingScore: 501, doubles: true, players: ['a1', 'b1', 'a2', 'b2'], allSetsThrows: { 'set-1': { 'leg-1': leg } }, playerModels: {} };
        expect(formFigures([doubles], 'a2')).toMatchObject({ legsWon: 1, dartsPerLeg: null });
        expect(formFigures([doubles], 'b2').legsWon).toBe(0);
    });
});
