import { describe, expect, it } from 'vitest';
import { trainingSummary } from './training.summary.js';

const now = new Date('2026-10-23T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 864e5);

describe('trainingSummary', () => {
    it('counts every training and keeps the bests of each kind', () => {
        const summary = trainingSummary({
            now,
            playerId: 'p',
            atc: [
                { scoring: 'Time', timeMs: 9000, mode: 'Single', createdAt: daysAgo(40) },
                { scoring: 'Time', timeMs: 7500, mode: 'Double', createdAt: daysAgo(3) },
                { scoring: 'Darts', darts: 30, mode: 'All', createdAt: daysAgo(2) },
            ],
            bots: [
                { hasWinner: true, createdAt: daysAgo(1), playerModels: { p: { hasWonGame: true, averages: { game: { overall: 52.34 } } } } },
                { hasWinner: true, createdAt: daysAgo(5), playerModels: { p: { hasWonGame: false, averages: { game: { overall: 40 } } } } },
                { hasWinner: false, createdAt: daysAgo(0), playerModels: {} },
            ],
            rules: [{ kind: 'bobs27', score: 300, createdAt: daysAgo(60) }],
        });
        expect(summary).toMatchObject({ total: 7, last30Days: 5 });
        expect(summary.atc.fastest).toEqual({ timeMs: 7500, mode: 'Double' });
        expect(summary.atc.fewestDarts).toEqual({ darts: 30, mode: 'All' });
        expect(summary.bot).toMatchObject({ count: 3, finished: 2, wins: 1, average: 46.2, bestAverage: 52.3 });
        expect(summary.rules.bobs27).toMatchObject({ count: 1, best: 300 });
    });

    it('is empty without trainings', () => {
        expect(trainingSummary({ playerId: 'p', now })).toMatchObject({ total: 0, last30Days: 0, lastAt: null, atc: { fastest: null }, bot: { average: null } });
    });
});
