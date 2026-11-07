import { describe, expect, it } from 'vitest';
import { eliminationBust, eliminationCanThrow, eliminationDartsMissing } from './elimination.input';
import { eliminationVisitOutcome } from '../rules/elimination';

const game = (gameOutMode, currentThrow, score = 280) => ({
    targetScore: 301,
    gameOutMode,
    hasWinner: false,
    players: ['a', 'b'],
    currentPlayerTurn: 'a',
    playerModels: { a: { score }, b: { score: 0 } },
    currentThrow,
});

describe('a visit of Elimination bust one short of the target', () => {
    it.each(['Double Out', 'Master Out'])('ends after the dart that busts it (%s), as the rules count it', (mode) => {
        // 280 + S20 = 300: one short of 301
        const bust = game(mode, ['S20', '', '']);
        expect(eliminationBust(bust, 300)).toBe(true);
        expect(eliminationCanThrow(bust, 300)).toBe(false);
        expect(eliminationDartsMissing(bust, bust.currentThrow, 300)).toBe(false);
        expect(eliminationVisitOutcome(bust, bust.currentThrow).busted).toBe(true);
    });

    it('plays on with Straight Out', () => {
        const straight = game('Straight Out', ['S20', '', '']);
        expect(eliminationBust(straight, 300)).toBe(false);
        expect(eliminationCanThrow(straight, 300)).toBe(true);
        expect(eliminationDartsMissing(straight, straight.currentThrow, 300)).toBe(true);
    });
});

describe('a visit of Elimination', () => {
    it('wants each of three darts below the target', () => {
        const open = game('Double Out', ['S5', '', '']);
        expect(eliminationCanThrow(open, 285)).toBe(true);
        expect(eliminationDartsMissing(open, open.currentThrow, 285)).toBe(true);
    });

    it('ends past the target, on it and after three darts', () => {
        expect(eliminationCanThrow(game('Double Out', ['T20', '', '']), 340)).toBe(false);
        expect(eliminationDartsMissing(game('Double Out', ['T20', '', '']), ['T20', '', ''], 340)).toBe(false);
        expect(eliminationBust(game('Double Out', ['D10', '', '']), 301)).toBe(false);
        expect(eliminationBust(game('Double Out', ['S20', '', '']), 301)).toBe(true);
        expect(eliminationBust(game('Master Out', ['T7', '', '']), 301)).toBe(false);
        expect(eliminationCanThrow(game('Double Out', ['S1', 'S1', 'S1']), 283)).toBe(false);
    });

    it('takes no darts once the game is won', () => {
        expect(eliminationCanThrow({ ...game('Double Out', ['', '', '']), hasWinner: true }, 280)).toBe(false);
    });
});
