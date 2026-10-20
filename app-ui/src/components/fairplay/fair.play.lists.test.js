import { describe, it, expect } from 'vitest';
import { listOf } from './fair.play.lists';

describe('fair play lists', () => {
    it('puts an entry on its list', () => {
        expect(listOf({ level: 'impossible' })).toBe('impossible');
        expect(listOf({ level: 'impossible', review: { status: 'watch' } })).toBe('impossible');
        expect(listOf({ level: 'impossible', review: { status: 'ok' } })).toBe('fine');
        expect(listOf({ level: 'error' })).toBe('error');
        expect(listOf({ level: 'error', review: { status: 'watch' } })).toBe('watch');
        expect(listOf({ level: 'suspicious' })).toBe('suspicious');
        expect(listOf({ level: 'suspicious', review: { status: 'ok' } })).toBe('fine');
    });
});
