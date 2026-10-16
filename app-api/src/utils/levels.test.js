import { describe, expect, it } from 'vitest';
import { playerLevel, levelInputs, x01OverallAverage, LEVELS } from './levels.js';

const inputs = (overrides = {}) => ({
    games: 0, wins: 0, badges: 0, num180s: 0, x01Games: 0, x01Average: 0, checkoutHit: 0, checkoutTotal: 0, cricketGames: 0, marksPerRound: 0,
    ...overrides,
});

describe('playerLevel', () => {
    it('starts every player as a Rookie', () => {
        const result = playerLevel(inputs());
        expect(result.level.name).toBe('Rookie');
        expect(result.level.index).toBe(1);
        expect(result.next.name).toBe('Pub Player');
        expect(result.next.missing).toEqual([{ id: 'xp', label: '150 more XP' }]);
        expect(result.progress).toBe(0);
    });

    it('adds up XP for games, wins, badges and skill', () => {
        const result = playerLevel(inputs({ games: 20, wins: 10, badges: 5, x01Games: 10, x01Average: 45, checkoutHit: 10, checkoutTotal: 40, cricketGames: 4, marksPerRound: 2 }));
        // 200 + 50 + 100 + 225 + 50 + 100
        expect(result.xp).toBe(725);
        expect(result.level.name).toBe('Club Regular');
    });

    it('counts every 180', () => {
        expect(playerLevel(inputs({ num180s: 12 })).xp).toBe(60);
        expect(playerLevel(inputs({ num180s: 12 })).breakdown.find(entry => entry.id === '180s')).toMatchObject({ value: 12, xp: 60 });
    });

    it('does not count skill after only a few games', () => {
        const result = playerLevel(inputs({ games: 2, x01Games: 2, x01Average: 100, checkoutHit: 2, checkoutTotal: 2 }));
        expect(result.xp).toBe(20);
        expect(result.breakdown.find(entry => entry.id === 'average').counts).toBe(false);
    });

    it('needs the average for the higher levels, however much XP there is', () => {
        const result = playerLevel(inputs({ games: 150, wins: 80, badges: 30, x01Games: 100, x01Average: 45 }));
        expect(result.xp).toBeGreaterThan(LEVELS.find(level => level.id === 'pro').xp);
        expect(result.level.name).toBe('League Player');
        expect(result.next.missing).toContainEqual({ id: 'average', label: 'an X01 average of 50' });
    });

    it('makes a Legend of a strong player with many games', () => {
        const result = playerLevel(inputs({ games: 200, wins: 150, badges: 50, x01Games: 150, x01Average: 95, checkoutHit: 50, checkoutTotal: 100, cricketGames: 10, marksPerRound: 4 }));
        expect(result.level.name).toBe('Legend');
        expect(result.next).toBeNull();
        expect(result.progress).toBe(100);
    });
});

describe('levelInputs', () => {
    it('reads games, wins, the average and checkouts from the games', () => {
        const x01 = (begMid, won, hit, total, num180s) => ({ playerModels: { a: { hasWonGame: won, averages: { game: { begMidGame: begMid } }, checkout: { game: { hit, total } }, scoreRanges: { game: { 180: num180s } } } } });
        const result = levelInputs({ x01Games: [x01(60, true, 1, 3, 2), x01(40, false, 0, 2, 1)], cricketGames: [], playerId: 'a', badgeCount: 3 });
        expect(result).toMatchObject({ games: 2, wins: 1, badges: 3, num180s: 3, x01Games: 2, x01Average: 50, checkoutHit: 1, checkoutTotal: 5 });
    });

    it('averages like the profile does', () => {
        expect(x01OverallAverage([], 'a')).toBe(0);
    });
});
