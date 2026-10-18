import { describe, it, expect } from 'vitest';
import { averageLevelOf, nextAverageLevel, levelChanges } from './average.levels';

describe('averageLevelOf', () => {
    it('finds the level of an average', () => {
        expect(averageLevelOf(12).name).toBe('Beginner');
        expect(averageLevelOf(40).name).toBe('Amateur');
        expect(averageLevelOf(59.9).name).toBe('Semi-pro');
        expect(averageLevelOf(101).name).toBe('Elite');
        expect(averageLevelOf(null)).toBeNull();
    });
});

describe('nextAverageLevel', () => {
    it('is the level above, none at the top', () => {
        expect(nextAverageLevel(42)).toMatchObject({ name: 'Semi-pro', min: 50 });
        expect(nextAverageLevel(95)).toBeNull();
    });
});

describe('levelChanges', () => {
    it('marks the start and every change of level', () => {
        expect(levelChanges([30, 35, null, 41, 44, 39, 52]).map(c => [c.index, c.level.name])).toEqual([
            [0, 'Hobby'], [3, 'Amateur'], [5, 'Hobby'], [6, 'Semi-pro'],
        ]);
    });

    it('is empty without values', () => {
        expect(levelChanges([null, undefined])).toEqual([]);
    });
});
