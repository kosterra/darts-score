import { describe, expect, it } from 'vitest';
import { checkoutProfile } from './checkout.profile.js';

const game = (sections, hit = {}) => ({ playerModels: { p1: { checkout: { sections }, hit } } });

describe('checkoutProfile', () => {
    it('learns the doubles a player hits best once there are enough darts at doubles', () => {
        const profile = checkoutProfile([
            game({ 16: { hit: 4, total: 9 }, 20: { hit: 2, total: 10 } }),
            game({ 16: { hit: 2, total: 5 }, 8: { hit: 1, total: 3 } }),
        ], 'p1');
        expect(profile.doubleDarts).toBe(27);
        expect(profile.doubleOrder).toEqual(['D16', 'D20']);
        expect(profile.favouriteDouble).toBe('D16');
        expect(profile.doubleSource).toBe('history');
        expect(profile.doubles[0]).toEqual({ double: 'D16', hit: 6, total: 14, rate: 42.9 });
    });

    it('learns nothing from a few darts', () => {
        const profile = checkoutProfile([game({ 16: { hit: 3, total: 6 } })], 'p1');
        expect(profile).toMatchObject({ doubleOrder: [], favouriteDouble: null, doubleSource: null });
    });

    it('puts the double the player set first', () => {
        const profile = checkoutProfile([game({ 16: { hit: 6, total: 20 }, 20: { hit: 1, total: 8 } })], 'p1', { favouriteDouble: 'D20' });
        expect(profile.doubleOrder).toEqual(['D20', 'D16']);
        expect(profile.doubleSource).toBe('set');
        expect(profile.learnedDouble).toBe('D16');
    });

    it('learns the main treble from the hits in the 20 and the 19 bed', () => {
        expect(checkoutProfile([game({}, { T19: 20, S19: 40, T20: 5, S20: 20 })], 'p1').mainTreble).toBe('T19');
        expect(checkoutProfile([game({}, { T19: 15, S19: 25, T20: 10, S20: 30 })], 'p1').mainTreble).toBe('T20');
        expect(checkoutProfile([game({}, { T19: 5 })], 'p1')).toMatchObject({ mainTreble: null, trebleSource: null });
        expect(checkoutProfile([], 'p1', { mainTreble: 'T19' })).toMatchObject({ mainTreble: 'T19', trebleSource: 'set' });
    });
});
