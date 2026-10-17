import { describe, it, expect } from 'vitest';
import { replayCricket, cricketFigures, cricketProgress, cricketMoments, hitsBySection } from './cricket.game.summary';

const visit = (playerId, darts) => ({ playerId, darts });

const game = {
    players: ['a', 'b'],
    allThrows: [
        visit('a', ['T20', 'T20', 'S20']),   // closes 20, scores 4 × 20
        visit('b', ['T20', '0', 'S5']),      // closes 20 for b too: 20 is dead now
        visit('a', ['T20', 'D25', '']),      // no points on the dead 20, 2 marks on the bull
        visit('b', ['T19', 'S19', 'D25']),   // closes 19, scores 19
    ],
    playerModels: {
        a: { score: 80, totalThrow: { game: { darts: 5, rounds: 2 } } },
        b: { score: 19, totalThrow: { game: { darts: 6, rounds: 2 } } },
    },
};

describe('replayCricket', () => {
    it('counts marks and points with the rules of the game', () => {
        const { visits, board } = replayCricket(game);
        expect(visits.map(v => [v.playerId, v.marks, v.points, v.totalPoints])).toEqual([
            ['a', 7, 80, 80],
            ['b', 3, 0, 0],
            ['a', 5, 0, 80],
            ['b', 6, 19, 19],
        ]);
        expect(visits[0].closed).toEqual([20]);
        // like the stored sectionHit, the marks beyond the third (the scoring ones) count too
        expect(board[20]).toMatchObject({ closedBy: 'a', closedAt: 0, marks: { a: 7, b: 3 } });
        expect(board[20].points).toEqual({ a: 80, b: 0 });
        expect(board[25].marks).toEqual({ a: 2, b: 2 });
        expect(visits[2].closedMarks).toBe(5);
    });
});

describe('cricketFigures', () => {
    it('works out the key figures of a player', () => {
        expect(cricketFigures(game, 'a')).toMatchObject({
            marksPerRound: 6,
            points: 80,
            marks: 12,
            bestRound: 7,
            bestPoints: 80,
            triples: 3,
            bulls: 2,
            closedFirst: 1,
            dartsThrown: 5,
        });
        expect(cricketFigures(game, 'b')).toMatchObject({ marksPerRound: 4.5, triples: 2, closedFirst: 1 });
    });
});

describe('cricketProgress', () => {
    it('gives closing marks and points per round, from round 0', () => {
        const { closing, points } = cricketProgress(game);
        expect(closing).toEqual([{ round: 0, a: 0, b: 0 }, { round: 1, a: 3, b: 3 }, { round: 2, a: 5, b: 8 }]);
        expect(points).toEqual([{ round: 0, a: 0, b: 0 }, { round: 1, a: 80, b: 0 }, { round: 2, a: 80, b: 19 }]);
    });
});

describe('cricketMoments', () => {
    it('names the best round, the most points, the triples and the bullseyes', () => {
        const moments = Object.fromEntries(cricketMoments(game).map(moment => [moment.id, moment]));
        expect(moments.marks).toMatchObject({ value: '7 marks', playerId: 'a', detail: 'round 1' });
        expect(moments.points).toMatchObject({ value: 80, playerId: 'a' });
        expect(moments.triples).toMatchObject({ value: 5 });
        expect(moments.bullseyes).toMatchObject({ value: 2 });
    });
});

describe('hitsBySection', () => {
    it('groups the hits by number and ring', () => {
        expect(hitsBySection({ T20: 2, S20: 1, D25: 3, X1: 4 })).toEqual([
            { section: '20', S: 1, D: 0, T: 2 },
            { section: '25', S: 0, D: 3, T: 0 },
        ]);
    });
});
