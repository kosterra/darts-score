import { describe, it, expect } from 'vitest';
import { checkClock, checkCricket, checkElimination, checkTraining, checkX01, compact, levelOf, usualAverages } from './integrity.js';

const rules = (findings) => findings.map(item => `${item.level}:${item.rule}`);
const v = (playerId, darts, roundScore, scoreLeft) => ({ playerId, darts, roundScore, scoreLeft });
const x01 = (legs, extra = {}) => ({
    _id: 'g1', players: ['a', 'b'], startingScore: 501, legOutMode: 'Double Out',
    createdAt: new Date(2026, 0, 1, 20, 0), updatedAt: new Date(2026, 0, 1, 21, 0),
    allSetsThrows: { 'set-1': Object.fromEntries(legs.map((leg, index) => [`leg-${index + 1}`, leg])) },
    playerModels: { a: { hasWonGame: true }, b: {} },
    ...extra,
});

describe('trainings', () => {
    it('finds an impossible and a world-class time', () => {
        expect(rules(checkTraining({ scoring: 'Time', timeMs: 1500, mode: 'Double', player: { id: 'a' } }))).toEqual(['impossible:tooFast']);
        expect(rules(checkTraining({ scoring: 'Time', timeMs: 4500, mode: 'Double', player: { id: 'a' } }))).toEqual(['suspicious:worldClassTime']);
        expect(checkTraining({ scoring: 'Time', timeMs: 9000, mode: 'Double', player: { id: 'a' } })).toEqual([]);
    });

    it('finds darts that do not add up, a perfect round and a world-class round on doubles', () => {
        expect(rules(checkTraining({ scoring: 'Darts', darts: 18, mode: 'Single' }))).toContain('impossible:tooFewDarts');
        expect(rules(checkTraining({ scoring: 'Darts', darts: 30, dartsPerTarget: Array(21).fill(1), mode: 'Single' }))).toContain('impossible:dartsMismatch');
        expect(rules(checkTraining({ scoring: 'Darts', darts: 21, mode: 'Single' }))).toEqual(['suspicious:perfectRound']);
        expect(rules(checkTraining({ scoring: 'Darts', darts: 33, mode: 'Double' }))).toEqual(['suspicious:hardRing']);
        expect(checkTraining({ scoring: 'Darts', darts: 33, mode: 'Single' })).toEqual([]);
    });

    it('finds a sudden jump of the personal best', () => {
        const history = [12000, 11500, 11800].map(timeMs => ({ timeMs }));
        expect(rules(checkTraining({ scoring: 'Time', timeMs: 6500, mode: 'Single' }, history))).toEqual(['suspicious:bestJump']);
        expect(checkTraining({ scoring: 'Time', timeMs: 10000, mode: 'Single' }, history)).toEqual([]);
        expect(checkTraining({ scoring: 'Time', timeMs: 6500, mode: 'Single' }, history.slice(0, 2))).toEqual([]);
    });
});

describe('X01', () => {
    it('lets a normal leg through', () => {
        const leg = [v('a', ['T20', 'T20', 'S20'], 140, 361), v('b', ['S20', 'S1', 'S5'], 26, 475), v('a', ['T20', 'T19', 'D20'], 157, 204)];
        expect(checkX01(x01([leg]))).toEqual([]);
    });

    it('finds a visit of four darts, a dart off the board, a wrong score and a wrong rest', () => {
        const leg = [v('a', ['T20', 'T20', 'T20', 'T20'], 240, 261), v('b', ['T21', '0', '0'], 63, 438), v('a', ['T20', 'S1', '0'], 100, 161), v('b', ['S20', '0', '0'], 20, 400)];
        expect(rules(checkX01(x01([leg])))).toEqual(expect.arrayContaining(['impossible:tooManyDarts', 'impossible:invalidDart', 'impossible:scoreMismatch', 'impossible:leftMismatch']));
    });

    it('finds a checkout without a double and a leg won with too few darts', () => {
        const leg = [v('a', ['T20', 'T20', 'T20'], 180, 321), v('a', ['T20', 'T20', 'T20'], 180, 141), v('a', ['T20', 'T19', 'S24'], 141, 0)];
        const found = rules(checkX01(x01([leg])));
        expect(found).toContain('impossible:wrongFinish');
        const short = [v('a', ['T20', 'T20', 'T20'], 180, 121), v('a', ['T20', 'D1'], 62, 0)];
        expect(rules(checkX01(x01([short], { startingScore: 301 })))).toContain('impossible:tooFewDarts');
    });

    it('flags a nine-darter, a professional average and a level far above the usual as suspicious', () => {
        const nine = [v('a', ['T20', 'T20', 'T20'], 180, 321), v('a', ['T20', 'T20', 'T20'], 180, 141), v('a', ['T20', 'T19', 'D12'], 141, 0)];
        const game = x01([nine], { playerModels: { a: { hasWonGame: true, averages: { game: { overall: 105 } }, totalThrow: { game: { rounds: 12 } } }, b: {} } });
        const found = checkX01(game, { usualAverage: () => 55 });
        expect(rules(found)).toEqual(expect.arrayContaining(['suspicious:nineDarter', 'suspicious:highAverage', 'suspicious:aboveUsual']));
        expect(levelOf(found)).toBe('suspicious');
    });

    it('flags an opponent who never scored and a game entered too fast', () => {
        const leg = Array.from({ length: 12 }, (_, index) => [v('a', ['S20', 'S20', 'S1'], 41, 501 - 41 * (index + 1)), v('b', ['0', '0', '0'], 0, 501)]).flat();
        const fast = x01([leg], { updatedAt: new Date(2026, 0, 1, 20, 1) });
        expect(rules(checkX01(fast))).toEqual(expect.arrayContaining(['suspicious:padding', 'suspicious:tooFast']));
    });

    it('takes the usual average from the other games only', () => {
        const games = Array.from({ length: 6 }, (_, index) => ({ _id: `g${index}`, players: ['a'], playerModels: { a: { averages: { game: { overall: 50 + index } }, totalThrow: { game: { rounds: 10 } } } } }));
        expect(usualAverages(games)('g0')('a')).toBe(53);
        expect(usualAverages(games.slice(0, 5))('g0')('a')).toBeNull();
    });
});

describe('other games', () => {
    it('finds professional marks in Cricket', () => {
        const game = { players: ['a', 'b'], allThrows: [], playerModels: { a: { hit: { T20: 6, T19: 6, T18: 6 }, totalThrow: { game: { rounds: 6 } } }, b: {} } };
        expect(rules(checkCricket(game))).toEqual(['suspicious:highMarks']);
    });

    it('finds a score above the darts in Elimination, but not in a bust', () => {
        const game = { players: ['a', 'b'], allThrows: [{ playerId: 'a', darts: ['S20', '0', '0'], roundScore: 60 }, { playerId: 'b', darts: ['T20', 'T20', 'T20'], roundScore: 0, bust: true }], playerModels: {} };
        expect(rules(checkElimination(game))).toEqual(['impossible:scoreMismatch']);
    });

    it('finds darts that cannot be entered in Around the Clock', () => {
        expect(rules(checkClock({ mode: 'Single', throws: [1, 0, 3], players: [], playerModels: {} }))).toEqual(['impossible:invalidDart']);
        expect(checkClock({ mode: 'All', skipAhead: true, throws: [1, 0, 3], players: [], playerModels: {} })).toEqual([]);
    });

    it('merges the same finding of a player', () => {
        const merged = compact([{ level: 'suspicious', rule: 'nineDarter', detail: 'leg 1', playerId: 'a' }, { level: 'suspicious', rule: 'nineDarter', detail: 'leg 2', playerId: 'a' }]);
        expect(merged).toEqual([{ level: 'suspicious', rule: 'nineDarter', detail: '2× · leg 1', playerId: 'a' }]);
    });
});
