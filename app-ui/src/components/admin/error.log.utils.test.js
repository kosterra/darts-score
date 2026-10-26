import { describe, it, expect } from 'vitest';
import { groupEntries } from './error.log.utils';

const entry = (id, time, message, level = 'error', error = null) => ({ id, time, message, level, error });

describe('the error log', () => {
    it('shows the same error once, with how often and since when', () => {
        const rows = groupEntries([
            entry('a', '08:41', 'Unhandled promise rejection', 'error', { message: 'close() no longer accepts a callback' }),
            entry('b', '08:30', 'Test mail failed', 'warn'),
            entry('c', '08:19', 'Unhandled promise rejection', 'error', { message: 'close() no longer accepts a callback' }),
            entry('d', '07:46', 'Unhandled promise rejection', 'error', { message: 'close() no longer accepts a callback' }),
        ]);
        expect(rows.map(row => [row.id, row.count, row.firstTime])).toEqual([['a', 3, '07:46'], ['b', 1, '08:30']]);
        expect(rows[0].times).toEqual(['08:41', '08:19', '07:46']);
    });

    it('keeps apart what differs in level or in the error behind it', () => {
        const rows = groupEntries([
            entry('a', '2', 'Request failed', 'error', { message: 'timeout' }),
            entry('b', '1', 'Request failed', 'error', { message: 'refused' }),
            entry('c', '0', 'Request failed', 'warn', { message: 'timeout' }),
        ]);
        expect(rows).toHaveLength(3);
    });
});
