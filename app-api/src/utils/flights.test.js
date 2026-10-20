import { describe, it, expect } from 'vitest';
import { flightPoints, flightStanding, mayUse, unlockCheck } from './flights.js';
import { LEVELS } from './levels.js';

const counts = { games: 20, wins: 8, trainings: 10, botTrainings: 4, botWins: 1, num180s: 2, highFinishes: 1 };

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

describe('flight standing', () => {
    it('owns the starters, can unlock commons it can pay for, waits for the level of the rarer ones', () => {
        const standing = flightStanding({ counts, levelIndex: 2, unlocked: [], levels: LEVELS });
        expect(standing.points).toMatchObject({ earned: 160, spent: 0, balance: 160 });
        const shape = (id) => standing.shapes.find(item => item.id === id);
        expect(shape('standard').state).toBe('owned');
        expect(shape('no6')).toMatchObject({ state: 'available', cost: 40 });
        expect(shape('fantail')).toMatchObject({ state: 'locked', reason: 'From the level Club Regular' });
        expect(shape('heart')).toMatchObject({ state: 'locked', reason: 'From the level League Player' });
    });

    it('spends the points on what was unlocked', () => {
        const standing = flightStanding({ counts, levelIndex: 3, unlocked: ['shape:no6', 'design:flames'], levels: LEVELS });
        expect(standing.points).toMatchObject({ earned: 160, spent: 140, balance: 20 });
        expect(mayUse(standing, 'shape', 'no6')).toBe(true);
        expect(mayUse(standing, 'design', 'flames')).toBe(true);
        expect(standing.designs.find(item => item.id === 'chevron')).toMatchObject({ state: 'expensive', reason: '20 more points' });
        expect(unlockCheck(standing, 'design', 'chevron')).toEqual({ ok: false, reason: '20 more points' });
        expect(unlockCheck(standing, 'shape', 'no6')).toEqual({ ok: false, reason: 'You have it already.' });
    });

    it('gives the legendary designs for a feat, never for points', () => {
        const before = flightStanding({ counts, levelIndex: 5, levels: LEVELS });
        expect(before.designs.find(item => item.id === 'nineDarter')).toMatchObject({ state: 'locked', reason: 'Throw a nine-darter' });
        expect(unlockCheck(before, 'design', 'nineDarter').ok).toBe(false);
        const after = flightStanding({ counts: { ...counts, nineDarters: 1 }, levelIndex: 6, levels: LEVELS });
        expect(mayUse(after, 'design', 'nineDarter')).toBe(true);
        expect(mayUse(after, 'design', 'holo')).toBe(true);
        expect(mayUse(after, 'design', 'bigFish')).toBe(false);
    });

    it('lets an unlock go through when it is affordable', () => {
        const standing = flightStanding({ counts: { ...counts, games: 30 }, levelIndex: 4, levels: LEVELS });
        expect(standing.points.balance).toBe(200);
        expect(unlockCheck(standing, 'design', 'dartboard')).toEqual({ ok: true, key: 'design:dartboard' });
    });
});
