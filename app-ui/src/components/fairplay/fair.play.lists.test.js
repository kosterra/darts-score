import { describe, it, expect } from 'vitest';
import { listOf, rulesByLevel } from './fair.play.lists';

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

    it('groups the rules by level, in their order', () => {
        const rules = (level, count) => Array.from({ length: count }, (_, index) => ({ id: `${level}${index}`, level }));
        const groups = rulesByLevel([...rules('impossible', 8), ...rules('error', 2), ...rules('suspicious', 15)]);
        expect(groups.map(group => [group.level, group.rules.length])).toEqual([['impossible', 8], ['error', 2], ['suspicious', 15]]);
    });
});
