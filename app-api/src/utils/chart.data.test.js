import { describe, it, expect } from 'vitest';
import { averageTrend, monthlyForm, scoringVsFinishing, dartsPerLegDistribution, trainingProgress, trainingDarts, recentForm, threeDartAverage } from './chart.data.js';

const P = 'p1';
const O = 'p2';
const x01 = (date, playerModel, extra = {}) => ({
    _id: date, updatedAt: new Date(date), startingScore: 501, players: [P, O],
    playerModels: { [P]: playerModel, [O]: { hasWonGame: !playerModel.hasWonGame } }, ...extra,
});

describe('chart data', () => {
    it('lists game averages oldest first and skips games without rounds', () => {
        const games = [
            x01('2026-02-01', { averages: { game: { overall: 60 } }, totalThrow: { game: { rounds: 8 } } }),
            x01('2026-01-01', { averages: { game: { overall: 50 } }, totalThrow: { game: { rounds: 8 } } }),
            x01('2026-03-01', { averages: { game: { overall: 99 } }, totalThrow: { game: { rounds: 0 } } }),
        ];
        expect(averageTrend(games, P).map(entry => entry.average)).toEqual([50, 60]);
    });

    it('groups games by month with win rate and a rounds-weighted average', () => {
        const games = [
            { type: 'x01', game: x01('2026-01-05', { hasWonGame: true, averages: { game: { overall: 60 } }, totalThrow: { game: { rounds: 10 } } }) },
            { type: 'x01', game: x01('2026-01-20', { hasWonGame: false, averages: { game: { overall: 30 } }, totalThrow: { game: { rounds: 30 } } }) },
            { type: 'cricket', game: { updatedAt: new Date('2026-02-02'), players: [P, O], playerModels: { [P]: { hasWonGame: true } } } },
        ];
        expect(monthlyForm(games, P)).toEqual([
            { month: '2026-01', games: 2, wins: 1, winRate: 50, average: 37.5 },
            { month: '2026-02', games: 1, wins: 1, winRate: 100, average: null },
        ]);
    });

    it('weights the scoring and finishing averages by their rounds', () => {
        const games = [
            x01('2026-01-01', { averages: { game: { begMidGame: 90, endGame: 20 } }, totalThrowBegMidGame: { game: { rounds: 4 } }, totalThrowEndGame: { game: { rounds: 1 } } }),
            x01('2026-01-02', { averages: { game: { begMidGame: 60, endGame: 40 } }, totalThrowBegMidGame: { game: { rounds: 2 } }, totalThrowEndGame: { game: { rounds: 3 } } }),
        ];
        expect(scoringVsFinishing(games, P)).toEqual({ opening: 80, finishing: 35 });
    });

    it('counts the darts of the 501 legs the player won', () => {
        const v = (playerId, darts, scoreLeft) => ({ playerId, darts, scoreLeft });
        const game = x01('2026-01-01', {}, { allSetsThrows: { 'set-1': {
            'leg-1': [v(P, ['T20', 'T20', 'T20'], 321), v(P, ['T20', 'T20', 'T20'], 141), v(P, ['T20', 'T19', 'D12'], 0)],
            'leg-2': [v(O, ['S1', 'S1', 'S1'], 0), v(P, ['T20', 'T20', ''], 381)],
            'leg-3': [v(P, ['S20', 'S20', 'S20'], 441), v(P, ['S20', 'S20', 'S20'], 381), v(P, ['T20', 'T20', 'T20'], 201), v(P, ['T20', 'T20', 'T20'], 21), v(P, ['S1', 'D10', ''], 0)],
        } } });
        const counts = Object.fromEntries(dartsPerLegDistribution([game], P).map(entry => [entry.bucket, entry.count]));
        expect(counts['9']).toBe(1);
        expect(counts['13–15']).toBe(1);
        expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(2);
    });

    it('keeps the best Around the Clock time so far per mode', () => {
        const entry = (date, mode, timeMs) => ({ createdAt: new Date(date), mode, timeMs });
        const progress = trainingProgress([entry('2026-01-03', 'Single', 500), entry('2026-01-01', 'Single', 600), entry('2026-01-02', 'Double', 900), entry('2026-01-04', 'Single', 550)]);
        expect(progress.Single.map(e => e.best)).toEqual([600, 500, 500]);
        expect(progress.Double).toHaveLength(1);
    });

    it('leaves the fewest-darts trainings out of the times', () => {
        const progress = trainingProgress([
            { createdAt: new Date('2026-01-01'), mode: 'Single', timeMs: 500 },
            { createdAt: new Date('2026-01-02'), mode: 'Single', scoring: 'Darts', darts: 40 },
        ]);
        expect(progress.Single).toHaveLength(1);
    });

    it('keeps the fewest darts so far per mode and the average darts per target', () => {
        const targets = (first) => [first, ...Array(20).fill(1)];
        const entry = (date, darts, first) => ({ createdAt: new Date(date), mode: 'Double', scoring: 'Darts', darts, dartsPerTarget: targets(first) });
        const result = trainingDarts([entry('2026-01-02', 22, 2), entry('2026-01-01', 25, 5), { createdAt: new Date('2026-01-03'), mode: 'Double', timeMs: 900 }]);
        expect(result.trainings).toBe(2);
        expect(result.progress.Double.map(e => e.best)).toEqual([25, 22]);
        expect(result.perTarget[0]).toBe(3.5);
        expect(result.perTarget[20]).toBe(1);
    });
});

describe('recentForm', () => {
    const game = (day, average) => ({
        _id: `g${day}`,
        updatedAt: new Date(2026, 0, day),
        playerModels: { p1: { averages: { game: { overall: average } }, totalThrow: { game: { rounds: 10 } } } },
    });

    it('compares the last games with the games before', () => {
        const games = [40, 42, 44, 46, 48, 50, 52, 54, 56, 58].map((average, i) => game(i + 1, average));
        expect(recentForm(games, 'p1')).toMatchObject({ games: 10, recentAverage: 54, previousAverage: 44, change: 10, trend: 'up' });
    });

    it('works in the order the games were played', () => {
        const games = [60, 60, 60, 60, 60, 50, 50, 50, 50, 50].map((average, i) => game(i + 1, average)).reverse();
        expect(recentForm(games, 'p1')).toMatchObject({ change: -10, trend: 'down', latest: [60, 60, 60, 60, 60, 50, 50, 50, 50, 50] });
    });

    it('calls small changes steady', () => {
        const games = [50, 50, 50, 50, 50, 51, 51, 51, 51, 51].map((average, i) => game(i + 1, average));
        expect(recentForm(games, 'p1').trend).toBe('steady');
    });

    it('has no trend without enough games', () => {
        expect(recentForm([game(1, 50), game(2, 60)], 'p1')).toMatchObject({ games: 2, recentAverage: 55, change: null, trend: null });
        expect(recentForm([], 'p1')).toMatchObject({ games: 0, recentAverage: null, trend: null, latest: [] });
    });
});

describe('threeDartAverage', () => {
    const game = (overall, rounds) => ({ playerModels: { p1: { averages: { game: { overall } }, totalThrow: { game: { rounds } } } } });

    it('weights every game by its visits', () => {
        expect(threeDartAverage([game(60, 10), game(90, 30)], 'p1')).toBe(82.5);
    });

    it('is 0 without visits', () => {
        expect(threeDartAverage([], 'p1')).toBe(0);
        expect(threeDartAverage([game(50, 0)], 'p1')).toBe(0);
    });
});
