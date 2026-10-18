import { describe, expect, it } from 'vitest';
import { cutThroatPoints, variantOf, winsWithScore } from './cricket.variants';

const marks = (values) => ({ 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 25: 0, ...values });

describe('cricket variants', () => {
    it('is Standard for games from before the variants', () => {
        expect(variantOf({})).toBe('Standard');
        expect(variantOf({ variant: 'Cut-throat' })).toBe('Cut-throat');
    });

    it('gives cut-throat points to the opponents who have the number open', () => {
        const game = {
            players: ['a', 'b', 'c'],
            playerModels: { b: { sectionHit: marks({ 20: 1 }) }, c: { sectionHit: marks({ 20: 3 }) } },
        };
        // a had 2 marks on 20 and threw T20: closes it and scores 2 marks
        expect(cutThroatPoints(game, 'a', marks({ 20: 2 }), marks({ 20: 5 }))).toEqual({ b: 40, c: 0 });
        // marks up to three only close
        expect(cutThroatPoints(game, 'a', marks({ 19: 0 }), marks({ 19: 3 }))).toEqual({ b: 0, c: 0 });
    });

    it('decides the winner by the variant', () => {
        expect(winsWithScore('Standard', 40, [20, 39])).toBe(true);
        expect(winsWithScore('Standard', 40, [40])).toBe(true);
        expect(winsWithScore('Standard', 30, [40])).toBe(false);
        expect(winsWithScore('Cut-throat', 40, [40, 60])).toBe(true);
        expect(winsWithScore('Cut-throat', 40, [20])).toBe(false);
        expect(winsWithScore('No-score', 0, [0])).toBe(true);
    });
});
