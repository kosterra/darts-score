import { describe, expect, it } from 'vitest';
import { x01Kpis, cricketKpis, eliminationKpis, clockKpis } from './kpi.data.js';

const visit = (playerId, scoreLeft, darts = ['S1', 'S1', 'S1']) => ({ playerId, scoreLeft, darts });

describe('x01Kpis', () => {
    const game = {
        startingScore: 501,
        allSetsThrows: {
            'set-1': {
                // a wins in 9 darts: 180, 180, 141
                'leg-1': [visit('a', 321), visit('b', 441), visit('a', 141), visit('b', 381), visit('a', 0)],
                // b wins; a busts once (stays on 101)
                'leg-2': [visit('b', 401), visit('a', 401), visit('b', 301), visit('a', 101), visit('b', 201), visit('a', 101), visit('b', 0, ['D20'])],
            },
        },
    };

    it('works out first 9, best leg, ton plus, highest visit and legs won', () => {
        expect(x01Kpis([game], 'a')).toEqual({
            firstNineAverage: round((180 + 180 + 141 + 100 + 300 + 0) / 6),
            bestLeg: 9,
            tonPlus: 5,
            highestVisit: 300,
            legsWon: 1,
        });
    });

    it('counts a busted visit as 0 and only the darts of won 501 legs', () => {
        const kpis = x01Kpis([game], 'b');
        expect(kpis.legsWon).toBe(1);
        expect(kpis.bestLeg).toBe(10);
    });

    it('scores a handicap from the player\'s own starting score', () => {
        const handicap = {
            startingScore: 501,
            playerModels: { b: { startingScore: 301 } },
            allSetsThrows: { 'set-1': { 'leg-1': [visit('a', 401), visit('b', 241), visit('a', 301), visit('b', 0)] } },
        };
        const kpis = x01Kpis([handicap], 'b');
        expect(kpis.highestVisit).toBe(241);
        // a 301 leg is no best 501 leg
        expect(kpis.bestLeg).toBeNull();
        expect(kpis.legsWon).toBe(1);
    });

    it('is empty without games', () => {
        expect(x01Kpis([], 'a')).toEqual({ firstNineAverage: null, bestLeg: null, tonPlus: 0, highestVisit: null, legsWon: 0 });
    });
});

function round(value) { return Math.round(value * 10) / 10; }

describe('cricketKpis', () => {
    it('counts marks on 15–20 and the bull per round', () => {
        const games = [
            { playerModels: { a: { hit: { T20: 2, S25: 1, D25: 1, T5: 3 }, totalThrow: { game: { rounds: 3 } }, score: 40 } } },
            { playerModels: { a: { hit: { S20: 3 }, totalThrow: { game: { rounds: 3 } }, score: 20 } } },
        ];
        expect(cricketKpis(games, 'a')).toEqual({ marksPerRound: 2, bestMarksPerRound: 3, averagePoints: 30 });
    });
});

describe('eliminationKpis', () => {
    it('has games, wins and visits', () => {
        const games = [
            { playerModels: { a: { hasWonGame: true } }, allThrows: [{ playerId: 'a', roundScore: 60, darts: ['S20', 'S20', 'S20'] }, { playerId: 'b', roundScore: 5, darts: ['S5'] }, { playerId: 'a', roundScore: 100, darts: ['T20', 'D20'] }] },
            { playerModels: { a: { hasWonGame: false } } },
        ];
        expect(eliminationKpis(games, 'a')).toEqual({ games: 2, wins: 1, averageVisit: 80, bestVisit: 100, dartsThrown: 5 });
    });
});

describe('clockKpis', () => {
    const game = (darts, hits, finished, won) => ({ playerModels: { p1: { darts, hits, finished, hasWonGame: won } } });

    it('counts wins, the fewest darts of a finished game and the hit rate', () => {
        const kpis = clockKpis([game(30, 21, true, true), game(24, 21, true, false), game(27, 15, false, false)], 'p1');
        expect(kpis).toMatchObject({ games: 3, wins: 1, fewestDarts: 24, averageDarts: 27, dartsThrown: 81 });
        expect(kpis.hitRate).toBe(70.4);
    });

    it('has no figures without games', () => {
        expect(clockKpis([], 'p1')).toMatchObject({ games: 0, wins: 0, fewestDarts: null, hitRate: null });
    });
});
