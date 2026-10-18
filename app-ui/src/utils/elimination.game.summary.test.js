import { describe, it, expect } from 'vitest';
import { replayElimination, eliminationFigures, eliminationRace, eliminationScoreRanges, eliminationHits, eliminationMoments } from './elimination.game.summary';

const visit = (playerId, darts, roundScore) => ({ playerId, darts, roundScore });

// first to 100: B lands on A's 60 and sends A back to 0, A comes back and wins
const game = {
    targetScore: 100,
    players: ['a', 'b'],
    allThrows: [
        visit('a', ['S20', 'S20', 'S20'], 60),
        visit('b', ['T20', '', ''], 60),          // lands on 60: A is knocked out
        visit('a', ['S19', 'T20', ''], 79),       // passes 19 and 79, never B's 60
        visit('b', ['S1', 'S1', 'S1'], 3),
        visit('a', ['S1', 'D10', ''], 21),        // A reaches 100 and wins
    ],
    playerModels: { a: { hasWonGame: true }, b: { hasWonGame: false } },
};

describe('replayElimination', () => {
    it('knocks a player back to 0 when an opponent lands on their score', () => {
        const replay = replayElimination(game);
        expect(replay.eliminations).toEqual([{ visit: 1, turn: 1, by: 'b', victim: 'a', at: 60 }]);
        expect(replay.visits.map(v => [v.playerId, v.before, v.after])).toEqual([
            ['a', 0, 60], ['b', 0, 60], ['a', 0, 79], ['b', 60, 63], ['a', 79, 100],
        ]);
        expect(replay.finalScores).toEqual({ a: 100, b: 63 });
    });
});

describe('eliminationFigures', () => {
    it('works out the key figures of a player', () => {
        expect(eliminationFigures(game, 'a')).toMatchObject({ score: 100, average: 53.3, highestVisit: 79, eliminationsMade: 0, timesEliminated: 1, pointsLost: 60, dartsThrown: 7, visits: 3 });
        expect(eliminationFigures(game, 'b')).toMatchObject({ score: 63, eliminationsMade: 1, timesEliminated: 0, pointsLost: 0 });
    });
});

describe('eliminationRace', () => {
    it('shows every score after each visit, with the drop of a knock-out', () => {
        expect(eliminationRace(game)).toEqual([
            { round: 0, a: 0, b: 0 },
            { round: 1, a: 60, b: 0 },
            { round: 2, a: 0, b: 60 },
            { round: 3, a: 79, b: 60 },
            { round: 4, a: 79, b: 63 },
            { round: 5, a: 100, b: 63 },
        ]);
    });
});

describe('eliminationScoreRanges and eliminationHits', () => {
    it('count the visits per range and the darts per number', () => {
        const replay = replayElimination(game);
        const ranges = Object.fromEntries(eliminationScoreRanges(['a', 'b'], replay).map(row => [row.range, [row.player1Count, row.player2Count]]));
        expect(ranges).toEqual({ '60-79': [2, 1], '20-39': [1, 0], '1-19': [0, 1] });
        expect(eliminationHits('a', replay)).toEqual([
            { section: '20', S: 3, D: 0, T: 1 },
            { section: '19', S: 1, D: 0, T: 0 },
            { section: '1', S: 1, D: 0, T: 0 },
            { section: '10', S: 0, D: 1, T: 0 },
        ]);
    });
});

describe('eliminationMoments', () => {
    it('names the knock-out, the winning visit and the comeback', () => {
        const moments = Object.fromEntries(eliminationMoments(game).map(moment => [moment.id, moment]));
        expect(moments.highest).toMatchObject({ value: 79, playerId: 'a' });
        expect(moments.knockout).toMatchObject({ value: '60 points', playerId: 'b', victim: 'a' });
        expect(moments.finish).toMatchObject({ value: 21, playerId: 'a' });
        expect(moments.comeback).toMatchObject({ playerId: 'a' });
    });
});

describe('replayElimination with busts', () => {
    it('lets a bust change nothing', () => {
        const game = {
            players: ['a', 'b'],
            allThrows: [
                { playerId: 'a', darts: ['T20', '0', '0'], roundScore: 60 },
                { playerId: 'b', darts: ['T20', 'S20', 'S20'], roundScore: 0, bust: true },
            ],
        };
        const { visits, eliminations, finalScores } = replayElimination(game);
        expect(visits[1]).toMatchObject({ score: 0, before: 0, after: 0, bust: true });
        expect(eliminations).toEqual([]);
        expect(finalScores).toEqual({ a: 60, b: 0 });
    });
});
