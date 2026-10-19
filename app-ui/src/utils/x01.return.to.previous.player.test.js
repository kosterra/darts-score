import { describe, it, expect } from 'vitest';
import X01ReturnToPreviousPlayer from './x01.return.to.previous.player';

const counts = (rounds, darts) => ({ game: { rounds, darts }, 'set-1': { rounds, darts, 'leg-1': { rounds, darts } } });
const model = (score, { rounds = 2, average = 60, ranges = {}, checkout } = {}) => ({
    score,
    averages: {
        game: { overall: average, begMidGame: average, endGame: average },
        'set-1': { overall: average, begMidSet: average, endSet: average, 'leg-1': { overall: average, begMidLeg: average, endLeg: average } },
    },
    totalThrow: counts(rounds, rounds * 3),
    totalThrowBegMidGame: counts(rounds, rounds * 3),
    totalThrowEndGame: counts(rounds, rounds * 3),
    hit: {},
    scoreRanges: { game: { ...ranges }, 'set-1': { ...ranges, 'leg-1': { ...ranges } } },
    bestThreeDarts: { game: { value: 0 }, 'set-1': { value: 0, 'leg-1': { value: 0 } } },
    checkout: checkout ?? { game: { total: 0, miss: 0, hit: 0 }, 'set-1': { total: 0, miss: 0, hit: 0, 'leg-1': { total: 0, miss: 0, hit: 0 } }, sections: {} },
});
const game = (legThrows, models, extra = {}) => ({
    players: ['a', 'b'],
    currentPlayerTurn: 'b',
    currentSet: 1,
    currentSetLeg: 1,
    legsPlayed: 0,
    startingScore: 501,
    legOutMode: 'Double Out',
    currentLegThrows: legThrows,
    playerModels: models,
    ...extra,
});

describe('X01ReturnToPreviousPlayer', () => {
    it('gives back the points of a visit', () => {
        const back = X01ReturnToPreviousPlayer(game(
            [
                { playerId: 'a', darts: ['T20', 'T20', 'S20'], roundScore: 140, scoreLeft: 361 },
                { playerId: 'b', darts: ['S20', 'S1', 'S5'], roundScore: 26, scoreLeft: 475 },
                { playerId: 'a', darts: ['T19', 'S19', 'S1'], roundScore: 77, scoreLeft: 284 },
            ],
            { a: model(284, { ranges: { '60-79': 1 } }), b: model(475) },
            { currentPlayerTurn: 'b' },
        ));
        expect(back.currentPlayerTurn).toBe('a');
        expect(back.currentThrow).toEqual(['T19', 'S19', 'S1']);
        expect(back.playerModels.a.score).toBe(361);
        expect(back.playerModels.a.averages.game.overall).toBe((60 * 2 - 77) / 1);
        expect(back.playerModels.a.scoreRanges.game['60-79']).toBeUndefined();
    });

    it('gives back nothing after a bust: the score stays what it was', () => {
        const back = X01ReturnToPreviousPlayer(game(
            [
                { playerId: 'a', darts: ['T20', 'T19', 'D20'], roundScore: 157, scoreLeft: 94 },
                { playerId: 'b', darts: ['S20', 'S1', 'S5'], roundScore: 26, scoreLeft: 475 },
                // 94 left, 121 thrown: a bust, still 94
                { playerId: 'a', darts: ['T20', 'T20', 'S1'], roundScore: 121, scoreLeft: 94 },
            ],
            { a: model(94, { ranges: { Busted: 1 } }), b: model(475) },
        ));
        expect(back.playerModels.a.score).toBe(94);
        expect(back.playerModels.a.averages.game.overall).toBe(60 * 2 / 1);
        expect(back.playerModels.a.scoreRanges.game.Busted).toBeUndefined();
    });

    it('starts from the starting score when it was the first visit of the leg', () => {
        const back = X01ReturnToPreviousPlayer(game(
            [{ playerId: 'a', darts: ['S20', 'S20', 'S20'], roundScore: 60, scoreLeft: 441 }],
            { a: model(441, { rounds: 1 }), b: model(501, { rounds: 0 }) },
        ));
        expect(back.playerModels.a.score).toBe(501);
    });

    it('takes back the checkout chances near the finish', () => {
        const checkout = {
            game: { total: 2, miss: 2, hit: 0 },
            'set-1': { total: 2, miss: 2, hit: 0, 'leg-1': { total: 2, miss: 2, hit: 0 } },
            sections: { 16: { total: 1, miss: 1, hit: 0 }, 8: { total: 1, miss: 1, hit: 0 } },
        };
        const back = X01ReturnToPreviousPlayer(game(
            [
                { playerId: 'a', darts: ['T20', 'T20', 'S20'], roundScore: 140, scoreLeft: 48 },
                { playerId: 'b', darts: ['S20'], roundScore: 20, scoreLeft: 481 },
                // 48 → S16 → 32 (a chance at D16) → S16 → 16 (a chance at D8) → 0? no: S6 leaves 10
                { playerId: 'a', darts: ['S16', 'S16', 'S6'], roundScore: 38, scoreLeft: 10 },
            ],
            { a: model(10, { checkout }), b: model(481) },
        ));
        expect(back.playerModels.a.score).toBe(48);
        expect(back.playerModels.a.checkout.game).toEqual({ total: 0, miss: 0, hit: 0 });
        expect(back.playerModels.a.checkout.sections).toEqual({});
    });
});
