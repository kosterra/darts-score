import { describe, it, expect } from 'vitest';
import { listOf, ruleColumns } from './fair.play.lists';

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

    it('puts the rules in two columns, each level whole in one', () => {
        const rules = (level, count) => Array.from({ length: count }, (_, index) => ({ id: `${level}${index}`, level }));
        const [first, second] = ruleColumns([...rules('impossible', 8), ...rules('error', 2), ...rules('suspicious', 15)]);
        expect(first.map(rule => rule.level)).toEqual([...Array(8).fill('impossible'), 'error', 'error']);
        expect(second).toHaveLength(15);
        expect(ruleColumns(rules('suspicious', 3))).toHaveLength(1);
    });
});
