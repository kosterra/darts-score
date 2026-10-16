import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/logger.model.js', () => ({
    default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// dayjs is not mocked — actual date arithmetic is tested via relative assertions
const { createGameFilterQuery, lastGamesOf } = await import('./game.utils.js');

describe('createGameFilterQuery', () => {
    beforeEach(() => vi.clearAllMocks());

    it('always sets gameIsRunning: false', () => {
        const result = createGameFilterQuery({ playerIds: ['p1'], includeOthers: false });
        expect(result.gameIsRunning).toBe(false);
    });

    it('uses exact player match when includeOthers is false', () => {
        const ids = ['p1', 'p2'];
        const result = createGameFilterQuery({ playerIds: ids, includeOthers: false });
        expect(result.players).toEqual({ $all: ids, $size: 2 });
    });

    it('allows extra players when includeOthers is true', () => {
        const ids = ['p1', 'p2'];
        const result = createGameFilterQuery({ playerIds: ids, includeOthers: true });
        expect(result.players).toEqual({ $all: ids });
        expect(result.players.$size).toBeUndefined();
    });

    it('adds no createdAt filter when dateFilter is "All"', () => {
        const result = createGameFilterQuery({ playerIds: ['p1'], includeOthers: false, dateFilter: 'All' });
        expect(result.createdAt).toBeUndefined();
    });

    it('adds no createdAt filter when dateFilter is absent', () => {
        const result = createGameFilterQuery({ playerIds: ['p1'], includeOthers: false });
        expect(result.createdAt).toBeUndefined();
    });

    it('adds createdAt range for "1 W"', () => {
        const result = createGameFilterQuery({ playerIds: ['p1'], includeOthers: false, dateFilter: '1 W' });
        expect(result.createdAt).toBeDefined();
        expect(result.createdAt.$gte).toBeInstanceOf(Date);
        expect(result.createdAt.$lt).toBeDefined();
        const diffMs = result.createdAt.$lt - result.createdAt.$gte;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(6);
        expect(diffDays).toBeLessThan(8);
    });

    it('adds createdAt range for "1 M"', () => {
        const result = createGameFilterQuery({ playerIds: ['p1'], includeOthers: false, dateFilter: '1 M' });
        const diffDays = (result.createdAt.$lt - result.createdAt.$gte) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(27);
        expect(diffDays).toBeLessThanOrEqual(32);
    });

    it('adds createdAt range for "1 Y"', () => {
        const result = createGameFilterQuery({ playerIds: ['p1'], includeOthers: false, dateFilter: '1 Y' });
        const diffDays = (result.createdAt.$lt - result.createdAt.$gte) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(364);
        expect(diffDays).toBeLessThanOrEqual(367);
    });
});

describe('createGameFilterQuery for the comparison filters', () => {
    it('filters by starting score and format', () => {
        const query = createGameFilterQuery({ playerIds: ['a'], startingScore: '501', format: { setMode: 'Best of', numberOfSets: 3, legMode: 'First to', numberOfLegs: '2' } });
        expect(query).toMatchObject({ startingScore: 501, setMode: 'Best of', numberOfSets: 3, legMode: 'First to', numberOfLegs: 2 });
    });

    it('uses a custom date range from the start of the first to the end of the last day', () => {
        const query = createGameFilterQuery({ playerIds: ['a'], dateFilter: 'Custom', from: '2026-10-01', to: '2026-10-15' });
        expect(query.createdAt.$gte.getDate()).toBe(1);
        expect(query.createdAt.$gte.getHours()).toBe(0);
        expect(query.createdAt.$lte.getDate()).toBe(15);
        expect(query.createdAt.$lte.getHours()).toBe(23);
    });

    it('lets nothing but plain values through', () => {
        const query = createGameFilterQuery({
            playerIds: ['a', { $ne: null }],
            includeOthers: 'yes',
            startingScore: { $gt: 0 },
            format: { setMode: { $ne: 'x' }, numberOfSets: { $gt: 0 } },
            dateFilter: 'Custom',
            from: { $gt: '' },
        });
        expect(query.players).toEqual({ $all: ['a'], $size: 1 });
        expect(query).not.toHaveProperty('startingScore');
        expect(query).not.toHaveProperty('setMode');
        expect(query).not.toHaveProperty('numberOfSets');
        expect(query).not.toHaveProperty('createdAt');
    });
});

describe('lastGamesOf', () => {
    it('accepts a positive number, capped, and nothing else', () => {
        expect(lastGamesOf({ lastGames: 10 })).toBe(10);
        expect(lastGamesOf({ lastGames: '5' })).toBe(5);
        expect(lastGamesOf({ lastGames: 100000 })).toBe(500);
        expect(lastGamesOf({ lastGames: 'All' })).toBeNull();
        expect(lastGamesOf({ lastGames: { $gt: 1 } })).toBeNull();
        expect(lastGamesOf({})).toBeNull();
    });
});
