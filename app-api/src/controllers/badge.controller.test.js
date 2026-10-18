import { describe, it, expect } from 'vitest';
import { gameShame } from './badge.controller.js';

const at = new Date(2026, 9, 10);
const ben = { _id: 'ben', shame: [{ badge: 'bedAndBreakfast', at, count: 2, sourceId: 'g1' }, { badge: 'madhouse', at, sourceId: 'g0' }], shameWashes: [{ badge: 'coldSpell', at, sourceId: 'g1' }] };
const kid = { _id: 'kid', dateOfBirth: new Date(2016, 0, 1), shame: [{ badge: 'nothingDoing', at, sourceId: 'g1' }], shameWashes: [] };

describe('gameShame', () => {
    it('lists what each player got and washed off in the game', () => {
        expect(gameShame([ben, kid], 'g1', null)).toEqual([
            expect.objectContaining({ player: 'ben', got: [expect.objectContaining({ id: 'bedAndBreakfast', title: 'Bed and Breakfast', count: 2 })], washed: [expect.objectContaining({ id: 'coldSpell' })] }),
            expect.objectContaining({ player: 'kid' }),
        ]);
        expect(gameShame([ben], 'g1', null)[0].got[0]).not.toHaveProperty('metric');
    });

    it('leaves children out when the club does', () => {
        expect(gameShame([ben, kid], 'g1', 16).map(entry => entry.player)).toEqual(['ben']);
    });
});
