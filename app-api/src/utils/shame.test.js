import { describe, it, expect } from 'vitest';
import { clubShameHolders, isShameChild, personalShame, shameCountsFrom, shameMinAgeOf } from './shame.js';

const day = (n) => new Date(2026, 0, n);
const player = (id, shame = [], shameWashes = []) => ({ _id: id, shame, shameWashes });
const madhouse = (n, club = 'c1', count = 1) => ({ badge: 'madhouse', at: day(n), club, count, sourceId: `g${n}` });

describe('personalShame', () => {
    it('adds up the count and knows whether it is still on the player', () => {
        const entry = personalShame(player('a', [madhouse(1), madhouse(5, 'c1', 2)])).find(e => e.id === 'madhouse');
        expect(entry).toMatchObject({ count: 3, active: true, washedAt: null });
        expect(entry.lastAt).toEqual(day(5));
    });

    it('is washed off by a good deed after the last one', () => {
        const washed = player('a', [madhouse(1)], [{ badge: 'madhouse', at: day(3), sourceId: 'g3' }]);
        expect(personalShame(washed).find(e => e.id === 'madhouse')).toMatchObject({ count: 1, active: false });
        const again = player('a', [madhouse(1), madhouse(4)], [{ badge: 'madhouse', at: day(3), sourceId: 'g3' }]);
        expect(personalShame(again).find(e => e.id === 'madhouse').active).toBe(true);
    });
});

describe('clubShameHolders', () => {
    it('gives each badge to the last one who got it in the club', () => {
        const holders = clubShameHolders([player('a', [madhouse(1)]), player('b', [madhouse(4)]), player('c', [madhouse(9, 'other')])], 'c1');
        expect(holders.find(e => e.id === 'madhouse')).toMatchObject({ holder: 'b', sourceId: 'g4' });
        expect(holders.find(e => e.id === 'coldSpell').holder).toBeNull();
    });

    it('leaves it free when the holder washed it off', () => {
        const holders = clubShameHolders([player('a', [madhouse(1)]), player('b', [madhouse(4)], [{ badge: 'madhouse', at: day(6), sourceId: 'g6' }])], 'c1');
        expect(holders.find(e => e.id === 'madhouse').holder).toBeNull();
    });
});

describe('children', () => {
    const child = { ...player('k', [madhouse(8)]), dateOfBirth: new Date(2015, 5, 1) };
    const turned16 = { ...player('t', [madhouse(2), madhouse(20)]), dateOfBirth: new Date(2010, 0, 10) };

    it('counts players from their 16th birthday when the club leaves children out', () => {
        expect(shameCountsFrom(child, null)).toBeNull();
        expect(shameCountsFrom(player('x'), 16)).toBeNull();
        expect(shameCountsFrom(turned16, 16)).toEqual(new Date(2026, 0, 10));
        expect(shameCountsFrom(turned16, 12)).toEqual(new Date(2022, 0, 10));
        expect(isShameChild(child, 16, day(1))).toBe(true);
        expect(isShameChild(child, 10, day(1))).toBe(false);
        expect(isShameChild(child, null, day(1))).toBe(false);
    });

    it('takes the age limit from the club', () => {
        expect(shameMinAgeOf({ shameWithoutChildren: false, shameMinAge: 12 })).toBeNull();
        expect(shameMinAgeOf({ shameWithoutChildren: true })).toBe(16);
        expect(shameMinAgeOf({ shameWithoutChildren: true, shameMinAge: 12 })).toBe(12);
    });

    it('never gives a child the trophy, and forgets what was done before 16', () => {
        const players = [player('a', [madhouse(1)]), child];
        expect(clubShameHolders(players, 'c1').find(e => e.id === 'madhouse').holder).toBe('k');
        expect(clubShameHolders(players, 'c1', { minAge: 16 }).find(e => e.id === 'madhouse').holder).toBe('a');
        const entry = personalShame(turned16, { from: shameCountsFrom(turned16, 16) }).find(e => e.id === 'madhouse');
        expect(entry.count).toBe(1);
    });
});
