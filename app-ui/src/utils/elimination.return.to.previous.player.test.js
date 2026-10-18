import { describe, it, expect } from 'vitest';
import EliminationReturnToPreviousPlayer from './elimination.return.to.previous.player';

const model = (score, darts, rounds, extra = {}) => ({ score, totalThrow: { darts, rounds }, bestThreeDarts: 0, scoreRanges: {}, ...extra });

describe('EliminationReturnToPreviousPlayer', () => {
    it('takes a bust back first: the darts go, the scores stay', () => {
        const game = {
            players: ['a', 'b'],
            currentPlayerTurn: 'b',
            playerModels: { a: model(41, 6, 2), b: model(100, 3, 1) },
            allThrows: [
                { playerId: 'a', darts: ['S20', 'S20', 'S1'], roundScore: 41, scoreLeft: 260, scoresBefore: { a: 0, b: 0 } },
                { playerId: 'b', darts: ['T20', 'D20', '0'], roundScore: 100, scoreLeft: 201, scoresBefore: { a: 41, b: 0 } },
                { playerId: 'a', darts: ['T20', 'T20', 'T20'], roundScore: 0, scoreLeft: 260, bust: true, scoresBefore: { a: 41, b: 100 } },
            ],
        };
        const back = EliminationReturnToPreviousPlayer(game);
        expect(back.currentPlayerTurn).toBe('a');
        expect(back.currentThrow).toEqual(['T20', 'T20', 'T20']);
        expect(back.allThrows).toHaveLength(2);
        expect(back.playerModels.a).toMatchObject({ score: 41, totalThrow: { darts: 3, rounds: 1 } });
        expect(back.playerModels.b.score).toBe(100);
    });

    it('gives a player sent back to 0 their score again', () => {
        const game = {
            players: ['a', 'b'],
            currentPlayerTurn: 'b',
            // a landed on 60, b's score: b was sent back to 0
            playerModels: { a: model(60, 3, 1, { scoreRanges: { '41-60': 1 }, bestThreeDarts: 60 }), b: model(0, 0, 0) },
            allThrows: [{ playerId: 'a', darts: ['T20', '0', '0'], roundScore: 60, scoreLeft: 241, scoresBefore: { a: 0, b: 60 } }],
        };
        const back = EliminationReturnToPreviousPlayer(game);
        expect(back.playerModels.a.score).toBe(0);
        expect(back.playerModels.b.score).toBe(60);
        expect(back.playerModels.a.scoreRanges).toEqual({});
    });

    it('takes only the points back on a visit from before the snapshot', () => {
        const game = {
            players: ['a', 'b'],
            currentPlayerTurn: 'b',
            playerModels: { a: model(60, 3, 1), b: model(0, 0, 0) },
            allThrows: [{ playerId: 'a', darts: ['T20', '0', '0'], roundScore: 60, scoreLeft: 241 }],
        };
        expect(EliminationReturnToPreviousPlayer(game).playerModels.a.score).toBe(0);
    });
});
