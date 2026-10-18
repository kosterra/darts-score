import { describe, expect, it } from 'vitest';
import { legSummaryOf } from './x01.live';

const game = (currentLegThrows, extra = {}) => ({ startingScore: 501, legOutMode: 'Double Out', players: ['a', 'b'], currentLegThrows, ...extra });

describe('legSummaryOf', () => {
    it('gives the last visit, the darts and the average of the leg', () => {
        const summary = legSummaryOf(game([
            { playerId: 'a', darts: ['T20', 'T20', 'S20'], roundScore: 140, scoreLeft: 361 },
            { playerId: 'b', darts: ['S1', 'S5', 'S20'], roundScore: 26, scoreLeft: 475 },
            { playerId: 'a', darts: ['S20', 'S20', 'S20'], roundScore: 60, scoreLeft: 301 },
        ]), 'a');
        expect(summary).toEqual({ lastVisit: { score: 60, bust: false }, darts: 6, average: 100 });
    });

    it('recognises a bust: the darts scored but the score stayed', () => {
        const summary = legSummaryOf(game([
            { playerId: 'a', darts: ['T20', 'T20', 'T20'], roundScore: 180, scoreLeft: 321 },
            { playerId: 'a', darts: ['T20', 'T20'], roundScore: 120, scoreLeft: 321 },
        ]), 'a');
        expect(summary.lastVisit).toEqual({ score: 0, bust: true });
        expect(summary.darts).toBe(5);
    });

    it('has nothing before the first visit', () => {
        expect(legSummaryOf(game([]), 'a')).toEqual({ lastVisit: null, darts: 0, average: null });
    });
});
