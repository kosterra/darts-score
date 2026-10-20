import { describe, it, expect } from 'vitest';
import { FLIGHT_DESIGNS, FLIGHT_SHAPES, flightPoints, flightStanding, mayUse, requirementOf, unlockCheck } from './flights.js';
import { LEVELS } from './levels.js';

const counts = { games: 20, wins: 8, trainings: 10, botTrainings: 4, botWins: 1, num180s: 2, highFinishes: 1 };
const standingOf = (extra = {}) => flightStanding({ counts, levelIndex: 2, average: null, unlocked: [], levels: LEVELS, ...extra });
const find = (standing, kind, id) => (kind === 'shape' ? standing.shapes : standing.designs).find(item => item.id === id);

describe('flight points', () => {
    it('adds up games, wins, trainings and what went well', () => {
        const { total, breakdown } = flightPoints(counts);
        expect(total).toBe(20 * 4 + 8 * 4 + 10 * 2 + 4 * 3 + 1 * 3 + 2 * 5 + 1 * 3);
        expect(breakdown.find(entry => entry.id === 'num180s')).toMatchObject({ count: 2, points: 10 });
    });

    it('counts nothing for nothing', () => {
        expect(flightPoints({}).total).toBe(0);
    });
});

describe('the catalog', () => {
    it('has unique ids, a price for everything bought and a feat for the legendary ones', () => {
        for (const items of [FLIGHT_SHAPES, FLIGHT_DESIGNS]) {
            expect(new Set(items.map(item => item.id)).size).toBe(items.length);
            items.filter(item => !['starter', 'legendary'].includes(item.rarity)).forEach(item => expect(item.cost).toBeGreaterThan(0));
            items.filter(item => item.rarity === 'legendary').forEach(item => expect(item.feat).toBeTruthy());
        }
    });

    it('says what a flight asks for', () => {
        expect(requirementOf({ level: 6, average: 60 }, LEVELS)).toBe('the level Pro and an X01 average of Pro (60)');
        expect(requirementOf({ average: 90 }, LEVELS)).toBe('an X01 average of Elite (90)');
        expect(requirementOf({}, LEVELS)).toBeNull();
    });
});

describe('flight standing', () => {
    it('owns the starters, can buy what it can pay for, waits for the level and the average', () => {
        const standing = standingOf();
        expect(standing.points).toMatchObject({ earned: 160, spent: 0, balance: 160 });
        expect(find(standing, 'shape', 'standard').state).toBe('owned');
        expect(find(standing, 'shape', 'no6')).toMatchObject({ state: 'available', cost: 60 });
        expect(find(standing, 'shape', 'fantail')).toMatchObject({ state: 'locked', reason: 'Needs the level Club Regular' });
        expect(find(standing, 'shape', 'vortex')).toMatchObject({ state: 'locked', reason: 'Needs an X01 average of Semi-pro (50)' });
        expect(find(standing, 'design', 'heart')).toBeUndefined();
        expect(find(standing, 'shape', 'heart')).toMatchObject({ state: 'expensive', reason: '80 more points' });
        expect(find(standing, 'design', 'pint')).toMatchObject({ state: 'available', requires: 'the level Pub Player' });
    });

    it('names only what is still missing of level and average', () => {
        const standing = standingOf({ levelIndex: 6, average: 55 });
        expect(find(standing, 'design', 'trophy')).toMatchObject({ state: 'locked', reason: 'Needs an X01 average of Pro (60)', requires: 'the level Pro and an X01 average of Pro (60)' });
        const both = standingOf({ levelIndex: 3, average: 41 });
        expect(find(both, 'design', 'laurel').reason).toBe('Needs the level World Class and an X01 average of World class (75)');
    });

    it('spends the points on what was unlocked', () => {
        const standing = standingOf({ levelIndex: 3, unlocked: ['shape:no6', 'design:flames'] });
        expect(standing.points).toMatchObject({ earned: 160, spent: 220, balance: 0 });
        expect(mayUse(standing, 'shape', 'no6')).toBe(true);
        expect(mayUse(standing, 'design', 'flames')).toBe(true);
        expect(find(standing, 'design', 'chevron')).toMatchObject({ state: 'expensive', reason: '60 more points' });
        expect(unlockCheck(standing, 'design', 'chevron')).toEqual({ ok: false, reason: '60 more points' });
        expect(unlockCheck(standing, 'shape', 'no6')).toEqual({ ok: false, reason: 'You have it already.' });
    });

    it('gives the legendary designs for a feat, never for points', () => {
        const before = standingOf({ levelIndex: 5 });
        expect(find(before, 'design', 'nineDarter')).toMatchObject({ state: 'locked', reason: 'Throw a nine-darter' });
        expect(unlockCheck(before, 'design', 'nineDarter').ok).toBe(false);
        const after = standingOf({ counts: { ...counts, nineDarters: 1 }, levelIndex: 6 });
        expect(mayUse(after, 'design', 'nineDarter')).toBe(true);
        expect(mayUse(after, 'design', 'holo')).toBe(true);
        expect(mayUse(after, 'design', 'bigFish')).toBe(false);
    });

    it('lets an unlock go through when level, average and points are there', () => {
        const standing = standingOf({ counts: { ...counts, games: 90 }, levelIndex: 6, average: 62 });
        expect(standing.points.balance).toBe(440);
        expect(unlockCheck(standing, 'design', 'trophy')).toEqual({ ok: false, reason: '10 more points' });
        expect(unlockCheck(standing, 'shape', 'tomahawk')).toEqual({ ok: true, key: 'shape:tomahawk' });
    });
});
