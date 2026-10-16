import { describe, expect, it } from 'vitest';
import { clubKpis, headToHead, clubRecords, gameLog } from './club.insights.js';

const visit = (playerId, scoreLeft, darts = ['S1', 'S1', 'S1']) => ({ playerId, scoreLeft, darts });

const x01Game = (overrides = {}) => ({
    _id: 'g1',
    startingScore: 501,
    hasWinner: true,
    createdAt: new Date('2026-10-10T19:00:00Z'),
    updatedAt: new Date('2026-10-10T20:00:00Z'),
    players: ['a', 'b'],
    allSetsThrows: { 'set-1': { 'leg-1': [visit('a', 321), visit('b', 441), visit('a', 141), visit('b', 381), visit('a', 0)] } },
    playerModels: {
        a: { hasWonGame: true, checkout: { game: { hit: 1, total: 2 } }, checkoutScores: { game: { 141: 1 } }, scoreRanges: { game: { 180: 2 } }, averages: { game: { overall: 167 } }, totalThrow: { game: { rounds: 3, darts: 9 } } },
        b: { hasWonGame: false, checkout: { game: { hit: 0, total: 0 } }, scoreRanges: { game: {} }, averages: { game: { overall: 60 } }, totalThrow: { game: { rounds: 2, darts: 6 } } },
    },
    ...overrides,
});

describe('clubKpis', () => {
    it('adds up the club over its finished games', () => {
        const game = x01Game();
        const kpis = clubKpis({
            finishedByType: [{ type: 'x01', games: [game] }, { type: 'cricket', games: [] }],
            allGames: [{ type: 'x01', game }, { type: 'x01', game: { ...game, hasWinner: false } }],
            members: [{ _id: 'a', activity: { bestWeekStreak: 3 } }, { _id: 'b', activity: { bestWeekStreak: 5 } }],
            now: new Date('2026-10-16T12:00:00Z'),
        });
        expect(kpis).toMatchObject({
            gamesStarted: 2,
            gamesFinished: 1,
            gamesThisMonth: 1,
            gamesLastMonth: 0,
            activePlayersThisMonth: 2,
            x01Average: round((167 * 3 + 60 * 2) / 5),
            checkoutHit: 1,
            checkoutTotal: 2,
            num180s: 2,
            highestCheckout: { value: 141, player: 'a' },
            bestLeg: { value: 9, player: 'a' },
            legsPlayed: 1,
            dartsThrown: 15,
            longestStreak: { value: 5, player: 'b' },
        });
    });
});

function round(value) { return Math.round(value * 10) / 10; }

describe('headToHead', () => {
    it('counts how often each player beat each other one', () => {
        const games = [x01Game(), x01Game(), x01Game({ playerModels: { a: {}, b: { hasWonGame: true } } })];
        const result = headToHead([{ type: 'x01', games }], new Set(['a', 'b']));
        expect(result.players).toEqual(['a', 'b']);
        expect(result.wins).toEqual({ a: { b: 2 }, b: { a: 1 } });
    });
});

describe('clubRecords', () => {
    it('keeps the best of each record with its holder', () => {
        const records = clubRecords([x01Game()]);
        expect(records.bestLeg).toMatchObject({ value: 9, player: 'a', gameId: 'g1' });
        expect(records.highestCheckout).toMatchObject({ value: 141, player: 'a' });
        expect(records.most180sInGame).toMatchObject({ value: 2, player: 'a' });
        expect(records.bestGameAverage).toMatchObject({ value: 167, player: 'a' });
    });
});

describe('gameLog', () => {
    it('lists every game with the club average behind finished X01 games', () => {
        const game = x01Game();
        expect(gameLog([{ type: 'x01', game }, { type: 'cricket', game: { createdAt: game.createdAt, hasWinner: false } }])).toEqual([
            { at: game.createdAt, type: 'x01', finished: true, points: 621, rounds: 5 },
            { at: game.createdAt, type: 'cricket', finished: false },
        ]);
    });
});
