import { describe, it, expect } from 'vitest';
import { toLogEntry } from './error.log.js';

describe('toLogEntry', () => {
    it('keeps errors with their error and context', () => {
        const entry = toLogEntry(JSON.stringify({
            severity: 'ERROR', time: '2026-10-16T20:00:00.000Z', pid: 1, host: 'x', msg: 'GET /api/x failed',
            err: { type: 'TypeError', message: 'boom', stack: 'TypeError: boom\n    at x' },
            request: { method: 'GET', url: '/api/x' },
        }));
        expect(entry).toMatchObject({
            level: 'error',
            message: 'GET /api/x failed',
            error: { type: 'TypeError', message: 'boom' },
            context: { request: { method: 'GET', url: '/api/x' } },
        });
        expect(entry.time.toISOString()).toBe('2026-10-16T20:00:00.000Z');
    });

    it('takes the error message when nothing else was logged', () => {
        expect(toLogEntry(JSON.stringify({ severity: 'WARN', err: { message: 'careful' } }))).toMatchObject({ level: 'warn', message: 'careful', context: null });
    });

    it('ignores info lines and broken lines', () => {
        expect(toLogEntry(JSON.stringify({ severity: 'INFO', msg: 'hello' }))).toBeNull();
        expect(toLogEntry('not json')).toBeNull();
    });
});
