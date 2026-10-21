import { describe, it, expect } from 'vitest';
import { clubFigures } from './public.figures.js';

describe('figures of the public clubs', () => {
    it('adds up the kinds of games, the last game and the busiest day', () => {
        const figures = clubFigures([
            { club: 'c1', weekday: 3, games: 4, recent: 2, lastAt: new Date(2026, 9, 13) },
            { club: 'c1', weekday: 5, games: 2, recent: 1, lastAt: new Date(2026, 9, 15) },
            { club: 'c1', weekday: 3, games: 1, recent: 0, lastAt: new Date(2026, 8, 1) },
            { club: 'c2', weekday: 2, games: 1, recent: 1, lastAt: new Date(2026, 9, 19) },
        ], [{ club: 'c1', averageSum: 45.5 * 10 + 60 * 30, rounds: 40, num180s: 3 }]);
        expect(figures.get('c1')).toEqual({ gamesPlayed: 7, gamesLast30Days: 3, lastGameAt: new Date(2026, 9, 15), x01Average: 56.4, num180s: 3, busiestDay: 'Tuesday' });
        // too few games for a day to stand out, and no X01 played
        expect(figures.get('c2')).toMatchObject({ gamesPlayed: 1, x01Average: null, num180s: 0, busiestDay: null });
    });

    it('names no day when two are as busy', () => {
        const figures = clubFigures([{ club: 'c1', weekday: 2, games: 3 }, { club: 'c1', weekday: 6, games: 3 }], []);
        expect(figures.get('c1').busiestDay).toBeNull();
    });
});
