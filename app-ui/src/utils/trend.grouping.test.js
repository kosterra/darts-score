import { describe, it, expect } from 'vitest';
import { groupByPeriod } from './trend.grouping';

const games = (count, from, daysApart) => Array.from({ length: count }, (_, i) => ({
    date: new Date(new Date(from).getTime() + i * daysApart * 86400000).toISOString(),
    player1: 40 + (i % 3),
    player2: i % 4 === 0 ? null : 35,
}));

describe('groupByPeriod', () => {
    it('keeps every game as a point up to 30 games', () => {
        const { step, rows } = groupByPeriod(games(30, '2026-01-01', 1), ['player1', 'player2']);
        expect(step).toBe('game');
        expect(rows).toHaveLength(30);
        expect(rows[0]).toMatchObject({ label: '01.01.26', games: 1, player1: 40 });
    });

    it('groups more games by month, averaging each player', () => {
        const { step, rows } = groupByPeriod(games(60, '2026-01-01', 1), ['player1', 'player2']);
        expect(step).toBe('month');
        expect(rows.map(row => row.label)).toEqual(['Jan 26', 'Feb 26', 'Mar 26']);
        expect(rows[0].games).toBe(31);
        expect(rows[0].player2).toBe(35);
        expect(rows.reduce((sum, row) => sum + row.games, 0)).toBe(60);
    });

    it('groups by quarter over three years', () => {
        const { step, rows } = groupByPeriod(games(40, '2023-01-01', 30), ['player1']);
        expect(step).toBe('quarter');
        expect(rows[0].label).toBe('Q1 23');
        expect(rows.reduce((sum, row) => sum + row.games, 0)).toBe(40);
    });

    it('adds the values up when asked to', () => {
        const { rows } = groupByPeriod(games(60, '2026-01-01', 1), ['player1'], { combine: 'sum' });
        // January: 31 games of 40, 41, 42, … in turn
        expect(rows[0].player1).toBe(Array.from({ length: 31 }, (_, i) => 40 + (i % 3)).reduce((a, b) => a + b, 0));
    });
});
