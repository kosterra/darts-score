import { describe, expect, it } from 'vitest';
import { ordinal, resultLine, scoreboardRows } from './atc.scoreboard';

const now = new Date('2026-10-18T12:00:00');
const entry = (id, playerId, timeMs, createdAt = '2026-10-18T10:00:00') => ({ id, player: { id: playerId, nickname: playerId }, timeMs, createdAt });

const entries = [
    entry('a1', 'anna', 9000),
    entry('a2', 'anna', 7000, '2026-09-30T10:00:00'),
    entry('b1', 'ben', 8000),
    entry('c1', 'cleo', 8000, '2026-10-01T10:00:00'),
];

describe('scoreboardRows', () => {
    it('lists each player once with their best time, fastest first', () => {
        expect(scoreboardRows(entries, { now }).map(({ entry: { id }, rank }) => [id, rank]))
            .toEqual([['a2', 1], ['c1', 2], ['b1', 3]]);
    });

    it('lists every attempt on request', () => {
        expect(scoreboardRows(entries, { list: 'all', now }).map(({ entry: { id } }) => id))
            .toEqual(['a2', 'c1', 'b1', 'a1']);
    });

    it('lists the own attempts on request', () => {
        expect(scoreboardRows(entries, { list: 'mine', myPlayerId: 'anna', now }).map(({ entry: { id }, rank }) => [id, rank]))
            .toEqual([['a2', 1], ['a1', 2]]);
        expect(scoreboardRows(entries, { list: 'mine', now })).toEqual([]);
    });

    it('keeps the times of the period only', () => {
        expect(scoreboardRows(entries, { period: 'today', now }).map(({ entry: { id } }) => id)).toEqual(['b1', 'a1']);
        expect(scoreboardRows(entries, { period: 'month', now }).map(({ entry: { id } }) => id)).toEqual(['c1', 'b1', 'a1']);
    });
});

describe('resultLine', () => {
    const rows = scoreboardRows(entries, { now });

    it('says the place and the gap to the place above', () => {
        expect(resultLine(rows, entries[2])).toBe('3rd of 3 · 0.00 s behind 2nd');
        expect(resultLine(rows, entries[1])).toBe('1st of 3 · 10.00 s ahead of 2nd');
    });

    it('names the best that stays when the time was not a best', () => {
        expect(resultLine(rows, entries[0])).toBe('Your best stays 1:10.00 · 1st of 3');
    });
});

describe('fewest darts', () => {
    const darts = (id, playerId, n) => ({ ...entry(id, playerId, undefined), scoring: 'Darts', darts: n });

    it('ranks by darts and counts the gap in darts', () => {
        const all = [darts('d1', 'anna', 30), darts('d2', 'ben', 27), darts('d3', 'cleo', 26)];
        const rows = scoreboardRows(all, { now });
        expect(rows.map(({ entry: { id } }) => id)).toEqual(['d3', 'd2', 'd1']);
        expect(resultLine(rows, all[0])).toBe('3rd of 3 · 3 darts behind 2nd');
        expect(resultLine(rows, all[2])).toBe('1st of 3 · 1 dart ahead of 2nd');
    });
});

describe('ordinal', () => {
    it('uses the right ending', () => {
        expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal))
            .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st']);
    });
});
