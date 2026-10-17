import { describe, expect, it } from 'vitest';
import { describeRules, hasHandicap, inModeOf, outModeOf, rulesOf, startingScoreOf } from './x01.rules';

const game = {
    startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out',
    players: ['a', 'b'],
    playerModels: { a: { score: 501 }, b: { score: 301, startingScore: 301, legOutMode: 'Straight Out' } },
};

describe('x01 rules', () => {
    it('uses the game settings without a handicap of the player', () => {
        expect(rulesOf(game, 'a')).toEqual({ startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out' });
    });

    it('uses the own settings of a player with a handicap', () => {
        expect(startingScoreOf(game, 'b')).toBe(301);
        expect(inModeOf(game, 'b')).toBe('Straight In');
        expect(outModeOf(game, 'b')).toBe('Straight Out');
    });

    it('tells whether a game has a handicap', () => {
        expect(hasHandicap(game)).toBe(true);
        expect(hasHandicap({ ...game, playerModels: { a: {}, b: { startingScore: '501' } } })).toBe(false);
    });

    it('describes the rules shortly', () => {
        expect(describeRules(rulesOf(game, 'b'))).toBe('301 · SI/SO');
    });
});
