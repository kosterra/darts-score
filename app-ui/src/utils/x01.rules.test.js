import { describe, expect, it } from 'vitest';
import { describeRules, hasHandicap, inModeOf, isBust, outModeOf, rulesOf, startingScoreOf } from './x01.rules';

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

describe('bust', () => {
    it('finds a bust below zero, on 1 and on a finish with the wrong dart', () => {
        expect(isBust(-4, ['T20'], 'Double Out')).toBe(true);
        expect(isBust(1, ['S19'], 'Double Out')).toBe(true);
        expect(isBust(0, ['S20'], 'Double Out')).toBe(true);
        expect(isBust(0, ['T20'], 'Master Out')).toBe(false);
        expect(isBust(0, ['S20'], 'Master Out')).toBe(true);
        expect(isBust(1, ['S19'], 'Straight Out')).toBe(false);
    });

    it('takes a finish on a double as no bust, also with the first dart', () => {
        expect(isBust(0, ['D20', '', ''], 'Double Out')).toBe(false);
        expect(isBust(0, ['S10', 'D5', ''], 'Double Out')).toBe(false);
    });

    it('takes a rest of 0 without darts for the player who has just won, not a bust', () => {
        expect(isBust(0, ['', '', ''], 'Double Out')).toBe(false);
        expect(isBust(0, [], 'Master Out')).toBe(false);
    });
});
