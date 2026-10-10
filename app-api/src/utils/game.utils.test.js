import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/logger.model.js', () => ({
    default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// dayjs is not mocked — actual date arithmetic is tested via relative assertions
const { createGameFilterQuery } = await import('./game.utils.js');

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
