import { describe, expect, it } from 'vitest';
import { checkoutRoutes, formatRoute } from './checkout.routes';

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
