import { describe, expect, it } from 'vitest';
import { trainingStreak, trainingSummary } from './training.summary.js';

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

    it('adds up the X01 figures of the trainings against the bot', () => {
        const model = (overall, begMidGame, endGame, extra) => ({ hasWonGame: false, averages: { game: { overall, begMidGame, endGame } }, ...extra });
        const { bot } = trainingSummary({
            now,
            playerId: 'p',
            bots: [
                { hasWinner: true, createdAt: daysAgo(1), playerModels: { p: model(60, 70, 30, { checkout: { game: { hit: 2, total: 8 }, sections: { 20: { hit: 1, total: 5 }, 16: { hit: 1, total: 3 } } }, scoreRanges: { game: { 180: 1, '100-119': 3, '60-79': 4 } }, checkoutScores: { game: { 40: 1, 121: 1 } } }) } },
                { hasWinner: true, createdAt: daysAgo(2), playerModels: { p: model(40, 50, 20, { checkout: { game: { hit: 1, total: 2 }, sections: { 20: { hit: 1, total: 2 } } }, scoreRanges: { game: { '140-159': 2 } } }) } },
            ],
        });
        expect(bot.checkout).toEqual({ hit: 3, total: 10, rate: 30 });
        // D8 has too few tries; D20: 2 of 7
        expect(bot.bestDouble).toEqual({ section: 20, hit: 2, total: 7, rate: 28.6 });
        expect(bot).toMatchObject({ oneEighties: 1, tonPlus: 6, highestCheckout: 121, scoring: 60, finishing: 25 });
    });

    it('counts the days in a row with a training, from today or yesterday', () => {
        expect(trainingStreak([daysAgo(0), daysAgo(1), daysAgo(1), daysAgo(2), daysAgo(4)].map(date => date.getTime()), now)).toBe(3);
        expect(trainingStreak([daysAgo(1), daysAgo(2)].map(date => date.getTime()), now)).toBe(2);
        expect(trainingStreak([daysAgo(2)].map(date => date.getTime()), now)).toBe(0);
    });

    it('is empty without trainings', () => {
        expect(trainingSummary({ playerId: 'p', now })).toMatchObject({ total: 0, last30Days: 0, lastAt: null, streak: 0, atc: { fastest: null }, bot: { average: null, checkout: { total: 0, rate: null }, bestDouble: null, highestCheckout: null } });
    });
});
