import { describe, it, expect } from 'vitest';
import { AVERAGE_LEVELS, averageLevelByKey, averageLevelOf, nextAverageLevel, levelChanges } from './average.levels';
import { LEVELS, LEVEL_STEPS, playLevel } from '../rules/levels.play';

describe('AVERAGE_LEVELS', () => {
    it('are the steps of the one scale, with their names, icons and colours', () => {
        expect(AVERAGE_LEVELS.map(level => [level.key, level.min, level.name])).toEqual([
            ['beginner', 0, 'Beginner'], ['hobby', 25, 'Hobby'], ['amateur', 40, 'Amateur'], ['semiPro', 50, 'Semi-pro'],
            ['pro', 60, 'Pro'], ['worldClass', 75, 'World class'], ['elite', 90, 'Elite'],
        ]);
        expect(AVERAGE_LEVELS.map(level => level.key)).toEqual(LEVELS);
        AVERAGE_LEVELS.forEach(level => {
            expect(level.icon).toBeTypeOf('function');
            expect(level.color).toMatch(/^#|^var|^rgb/);
        });
        expect(averageLevelByKey('semiPro').name).toBe('Semi-pro');
        expect(averageLevelByKey('pub')).toBeNull();
    });

    it('give an average the same level as a game judged by it', () => {
        const bands = LEVEL_STEPS.slice(1).map(step => step.average);
        [0, 24.9, 25, 39.9, 40, 50, 59.9, 60, 74.9, 75, 89.9, 90, 120].forEach(average => {
            expect(averageLevelOf(average).key).toBe(playLevel(average, { bands }));
        });
    });
});

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
