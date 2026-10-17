import { describe, it, expect } from 'vitest';
import { hitFields, formatShare } from './hit.fields';

describe('hitFields', () => {
    it('lists the hit fields, most hit first, with their share', () => {
        const fields = hitFields([
            { section: '20', S: 6, D: 1, T: 2 },
            { section: '25', S: 1, D: 0, T: 0 },
            { section: '5', S: 0, D: 0, T: 0 },
        ]);
        expect(fields.map(field => [field.short, field.count])).toEqual([['S20', 6], ['T20', 2], ['D20', 1], ['Outer bull', 1]]);
        expect(fields[0]).toMatchObject({ name: 'Single 20', share: 0.6 });
    });

    it('is empty without hits', () => {
        expect(hitFields([])).toEqual([]);
    });
});

describe('formatShare', () => {
    it('rounds to whole percent, with a decimal below one', () => {
        expect(formatShare(0.123)).toBe('12 %');
        expect(formatShare(0.004)).toBe('0.4 %');
        expect(formatShare(0)).toBe('0 %');
    });
});
