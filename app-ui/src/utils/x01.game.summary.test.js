import { describe, it, expect } from 'vitest';
import { legsOf, raceOf, playerFigures, matchMoments } from './x01.game.summary';

const visit = (playerId, roundScore, scoreLeft, darts = ['S20', 'S20', 'S20']) => ({ playerId, roundScore, scoreLeft, darts });

// best of 3 legs, 101: A wins leg 1 and leg 3, B wins leg 2
const game = {
    startingScore: 101,
    players: ['a', 'b'],
    setsPlayed: 1,
    allSetsThrows: {
        'set-1': {
            'leg-1': [visit('a', 60, 41), visit('b', 45, 56), visit('a', 41, 0, ['S1', 'D20', ''])],
            'leg-2': [visit('b', 100, 1), visit('a', 26, 75), visit('b', 0, 1, ['S1', '0', '0'])],
            'leg-10': [visit('a', 180, -79)],
        },
    },
    playerModels: {
        a: { averages: { game: { overall: 61.75 } }, checkout: { game: { hit: 1, total: 2 } }, checkoutScores: { game: { 41: 1 } }, scoreRanges: { game: { 180: 1 } }, totalThrow: { game: { darts: 8 } }, legsWon: { game: 1 }, setsWon: 1 },
        b: { averages: { game: { overall: 48.3 } }, checkout: { game: { hit: 0, total: 1 } }, scoreRanges: { game: {} }, totalThrow: { game: { darts: 9 } }, legsWon: { game: 0 }, setsWon: 0 },
    },
};

describe('legsOf', () => {
    it('lists the legs in the order played, with numbers sorted as numbers', () => {
        const legs = legsOf(game);
        expect(legs.map(leg => leg.key)).toEqual(['set-1/leg-1', 'set-1/leg-2', 'set-1/leg-10']);
        expect(legs[0]).toMatchObject({ number: 1, legInSet: 1, starter: 'a', winner: 'a', winnerDarts: 5, checkout: 41, highest: { playerId: 'a', score: 60 } });
        expect(legs[1]).toMatchObject({ starter: 'b', winner: null, winnerDarts: null, checkout: null });
    });
});

describe('raceOf', () => {
    it('gives the score left after every visit of each player', () => {
        const [leg] = legsOf(game);
        expect(raceOf(leg, ['a', 'b'], 101)).toEqual([
            { visit: 0, a: 101, b: 101 },
            { visit: 1, a: 41, b: 56 },
            { visit: 2, a: 0, b: null },
        ]);
    });
});

describe('playerFigures', () => {
    it('works out the key figures of a player', () => {
        expect(playerFigures(game, 'a')).toMatchObject({
            average: 61.8,
            firstNine: 76.8,
            checkoutRate: 50,
            checkoutDetail: '1/2',
            highestCheckout: 41,
            bestLeg: 5,
            highestVisit: 180,
            oneEighties: 1,
            dartsThrown: 8,
            legsWon: 1,
        });
        expect(playerFigures(game, 'b')).toMatchObject({ checkoutRate: 0, highestCheckout: null, bestLeg: null });
    });
});

describe('matchMoments', () => {
    it('names the highest visit, best checkout, quickest leg and the 180s', () => {
        const moments = Object.fromEntries(matchMoments(game).map(moment => [moment.id, moment]));
        expect(moments.highest).toMatchObject({ value: 180, playerId: 'a' });
        expect(moments.checkout).toMatchObject({ value: 41, playerId: 'a', detail: 'leg 1' });
        expect(moments.quickest).toMatchObject({ value: '5 darts', playerId: 'a' });
        expect(moments['180s']).toMatchObject({ value: 1, label: '180' });
    });

    it('finds a deciding last leg', () => {
        const decided = {
            ...game,
            allSetsThrows: { 'set-1': {
                'leg-1': [visit('a', 101, 0)],
                'leg-2': [visit('b', 101, 0)],
                'leg-3': [visit('a', 101, 0)],
            } },
        };
        expect(matchMoments(decided).find(moment => moment.id === 'decider')).toMatchObject({ value: 'leg 3', playerId: 'a' });
    });
});
