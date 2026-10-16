import { describe, it, expect } from 'vitest';
import { averageTrend, monthlyForm, scoringVsFinishing, dartsPerLegDistribution, trainingProgress } from './chart.data.js';

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
});
