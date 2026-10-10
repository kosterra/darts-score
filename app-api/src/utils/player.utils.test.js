import { describe, it, expect, vi } from 'vitest';

vi.mock('../models/logger.model.js', () => ({
    default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { createPlayerFilterQuery } = await import('./player.utils.js');

describe('createPlayerFilterQuery', () => {
    it('returns a $in query for the given playerIds', () => {
        const ids = ['abc', 'def'];
        const result = createPlayerFilterQuery({ playerIds: ids });
        expect(result).toEqual({ _id: { $in: ids } });
    });

    it('returns empty $in for empty playerIds', () => {
        const result = createPlayerFilterQuery({ playerIds: [] });
        expect(result).toEqual({ _id: { $in: [] } });
    });

    it('preserves the exact array reference', () => {
        const ids = ['x'];
        const result = createPlayerFilterQuery({ playerIds: ids });
        expect(result._id.$in).toBe(ids);
    });
});
