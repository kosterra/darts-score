import { describe, it, expect } from 'vitest';
import { dartFor, knockBacks, liveScores, visitsOf } from './elimination.live';

const game = {
    targetScore: 301,
    players: ['a', 'b', 'c'],
    currentPlayerTurn: 'a',
    playerModels: { a: { score: 41 }, b: { score: 81 }, c: { score: 200 } },
    allThrows: [{ playerId: 'a', darts: ['S20', 'S20', 'S1'], roundScore: 41, scoreLeft: 260 }],
};

describe('elimination live', () => {
    it('finds the simplest dart for a score', () => {
        expect(dartFor(20)).toBe('S20');
        expect(dartFor(40)).toBe('D20');
        expect(dartFor(57)).toBe('T19');
        expect(dartFor(50)).toBe('D25');
        expect(dartFor(61)).toBeNull();
    });

    it('adds the darts being entered to the score of the player at the oche', () => {
        expect(liveScores(game, 20)).toEqual({ a: 61, b: 81, c: 200 });
    });

    it('knows whom one dart sends back to 0', () => {
        expect(knockBacks(game, liveScores(game, 0), 'a')).toEqual([{ playerId: 'b', dart: 'D20' }]);
    });

    it('lists the visits with the total after each', () => {
        expect(visitsOf(game, 'a')).toEqual([{ darts: ['S20', 'S20', 'S1'], roundScore: 41, total: 41 }]);
    });
});
