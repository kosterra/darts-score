import { describe, expect, it } from 'vitest';
import { playedBoards, progressOf, trendOf } from './training.trend';
import { BOBS_27, CHECKOUT_121 } from '../rules/trainings';

const attempt = (player, score, day) => ({ player: { id: player }, score, createdAt: `2026-10-${String(day).padStart(2, '0')}T18:00:00Z` });

describe('the trend of a training', () => {
    it('keeps the player\'s own attempts, oldest first, each with the best up to it', () => {
        const rows = trendOf([attempt('a', 120, 5), attempt('b', 300, 4), attempt('a', 90, 3), attempt('a', 150, 7)], 'a');
        expect(rows.map(row => row.score)).toEqual([90, 120, 150]);
        expect(rows.map(row => row.best)).toEqual([90, 120, 150]);
        // fewer is better: the best only goes down
        expect(trendOf([attempt('a', 40, 1), attempt('a', 50, 2), attempt('a', 30, 3)], 'a', true).map(row => row.best)).toEqual([40, 40, 30]);
    });

    it('compares the latest attempts with the first ones, better as positive', () => {
        const rows = [10, 20, 30, 40].map((score, index) => ({ score, index }));
        expect(progressOf(rows)).toEqual({ change: 20, size: 2 });
        // fewer darts later: better
        expect(progressOf(rows.slice().reverse(), true)).toEqual({ change: 20, size: 2 });
        expect(progressOf(rows.slice(0, 3))).toBeNull();
        // ten of each at most
        const many = Array.from({ length: 30 }, (_, index) => ({ score: index, index }));
        expect(progressOf(many).size).toBe(10);
    });

    it('knows the settings a player trained with, the most played first', () => {
        const at = (player, settings, day) => ({ ...attempt(player, 125, day), settings });
        const trainings = [at('a', { attempts: 20, darts: 9 }, 1), at('a', {}, 2), at('a', { attempts: 10, darts: 9 }, 3), at('a', { attempts: 50, darts: 6 }, 4), at('b', { attempts: 30 }, 5)];
        expect(playedBoards(trainings, 'a', CHECKOUT_121)).toEqual([
            // an older attempt without settings: the defaults
            { key: 'attempts:10|darts:9', settings: { attempts: 10, darts: 9 }, count: 2 },
            // one each: the latest first
            { key: 'attempts:50|darts:6', settings: { attempts: 50, darts: 6 }, count: 1 },
            { key: 'attempts:20|darts:9', settings: { attempts: 20, darts: 9 }, count: 1 },
        ]);
        expect(playedBoards([attempt('a', 100, 1)], 'a', BOBS_27)).toEqual([{ key: '', settings: {}, count: 1 }]);
        expect(playedBoards([], 'a', BOBS_27)).toEqual([]);
    });
});
