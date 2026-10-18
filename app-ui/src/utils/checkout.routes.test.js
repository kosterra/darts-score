import { describe, expect, it } from 'vitest';
import { checkoutRoutes, formatRoute, scoringTip, setupSuggestions } from './checkout.routes';

describe('checkoutRoutes', () => {
    it('knows the only way to finish 170', () => {
        expect(checkoutRoutes(170)).toEqual([['T20', 'T20', 'D25']]);
    });

    it('has no finish for the bogey numbers and above 170', () => {
        for (const score of [169, 168, 166, 165, 163, 162, 159, 171, 180]) expect(checkoutRoutes(score)).toEqual([]);
    });

    it('lists the fewest darts first, with the common double first among them', () => {
        const routes = checkoutRoutes(40);
        expect(routes[0]).toEqual(['D20']);
        expect(routes.slice(1).every(route => route.length >= 2)).toBe(true);
        expect(routes.findIndex(route => route.length === 3)).toBeGreaterThan(routes.findIndex(route => route.length === 2));
    });

    it('puts the route of the checkout table first', () => {
        expect(checkoutRoutes(81)[0]).toEqual(['T19', 'D12']);
        expect(checkoutRoutes(81).length).toBeGreaterThan(10);
    });

    it('lists each combination once: the darts before the double in any order', () => {
        const keys = checkoutRoutes(100).map(route => [...route.slice(0, -1)].sort().join() + '>' + route.at(-1));
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('keeps to the darts left in the visit', () => {
        expect(checkoutRoutes(81, { dartsLeft: 1 })).toEqual([]);
        expect(checkoutRoutes(81, { dartsLeft: 2 }).every(route => route.length <= 2)).toBe(true);
        expect(checkoutRoutes(50, { dartsLeft: 1 })).toEqual([['D25']]);
    });

    it('follows the out mode', () => {
        expect(checkoutRoutes(3, { outMode: 'Double Out', dartsLeft: 1 })).toEqual([]);
        expect(checkoutRoutes(3, { outMode: 'Straight Out', dartsLeft: 1 })).toEqual([['S3'], ['T1']]);
        expect(checkoutRoutes(3, { outMode: 'Master Out', dartsLeft: 1 })).toEqual([['T1']]);
    });
});

describe('formatRoute', () => {
    it('writes the darts with dots', () => {
        expect(formatRoute(['T20', 'T19', 'D12'])).toBe('T20 · T19 · D12');
    });
});

describe('setupSuggestions', () => {
    it('takes the suggestion of the checkout table for a score without a finish', () => {
        expect(setupSuggestions(169)).toEqual([
            { darts: ['T19', 'T20', 'S12'], leaves: 40, note: null },
            { darts: ['T19', 'T19', 'S19'], leaves: 36, note: null },
        ]);
        expect(setupSuggestions(168)[0]).toEqual({ darts: ['T20', 'T20'], leaves: 48, note: 'then pick S8 or S16' });
        expect(setupSuggestions(163)[0].leaves).toBe(40);
    });

    it('works out a setup with fewer darts left, leaving a good double', () => {
        const [first] = setupSuggestions(99, { dartsLeft: 2 });
        expect(first.leaves).toBe(40);
        expect(first.darts.reduce((sum, dart) => sum + ({ S: 1, D: 2, T: 3 }[dart[0]]) * Number(dart.slice(1)), 0)).toBe(59);
    });

    it('has none when a finish is possible, the score is too high, or without double out', () => {
        expect(setupSuggestions(170)).toEqual([]);
        expect(setupSuggestions(40)).toEqual([]);
        expect(setupSuggestions(301, { dartsLeft: 1 })).toEqual([]);
        expect(setupSuggestions(200)).toEqual([]);
        expect(setupSuggestions(169, { outMode: 'Straight Out' })).toEqual([]);
    });
});

describe('scoringTip', () => {
    it('leaves a finish for the next visit', () => {
        expect(scoringTip(251)).toMatchObject({ darts: ['T20', 'T20', 'T20'], leaves: 71 });
    });

    it('avoids leaving a bogey number', () => {
        const tip = scoringTip(349);
        expect(tip.darts).toEqual(['T20', 'T20', 'T19']);
        expect(tip.leaves).toBe(172);
        expect(tip.advice).toMatch(/169 would be a bogey/);
    });

    it('gives the usual advice when the finish is still far away', () => {
        expect(scoringTip(450)).toEqual({ darts: null, leaves: null, advice: 'Stay on T20; switch to T19 if the 20 is blocked.' });
    });

    it('has nothing when a finish or a setup is possible', () => {
        expect(scoringTip(117)).toBeNull();
        expect(scoringTip(169)).toBeNull();
    });

    it('plans with the darts left in the visit', () => {
        expect(scoringTip(231, { dartsLeft: 1 })).toEqual(expect.objectContaining({ darts: null }));
        expect(scoringTip(201, { dartsLeft: 2 }).darts).toHaveLength(2);
    });
});
