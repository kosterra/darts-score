import { describe, expect, it } from 'vitest';
import { formOf, visitsOf } from './x01.form';

const visit = (playerId, scoreLeft) => ({ playerId, scoreLeft, darts: [], roundScore: 0 });

const game = (overrides = {}) => ({
    startingScore: 501,
    currentSet: 1,
    currentSetLeg: 2,
    allSetsThrows: {
        'set-1': {
            'leg-1': [visit('a', 441), visit('b', 401), visit('a', 381), visit('b', 301), visit('a', 0)],
        },
    },
    currentLegThrows: [visit('b', 461), visit('a', 401)],
    ...overrides,
});

describe('visitsOf', () => {
    it('lists a player\'s visits over all legs, the running leg last', () => {
        expect(visitsOf(game(), 'a').map(v => v.score)).toEqual([60, 60, 381, 100]);
        expect(visitsOf(game(), 'a').map(v => v.running)).toEqual([false, false, false, true]);
    });

    it('counts a busted visit as 0', () => {
        const busted = game({ currentLegThrows: [visit('a', 401), visit('a', 401)] });
        expect(visitsOf(busted, 'a').slice(-2).map(v => v.score)).toEqual([100, 0]);
    });

    it('ignores stray keys in the stored throws', () => {
        const odd = game({ allSetsThrows: { 1: [[visit('a', 1)]], 'set-1': { 'leg-1': [visit('a', 441)] } } });
        expect(visitsOf(odd, 'a').map(v => v.score)).toEqual([60, 100]);
    });
});

describe('formOf', () => {
    it('has averages for the last 3 visits, the leg and the game', () => {
        const form = formOf(game(), 'b');
        expect(form.visits.map(v => v.score)).toEqual([100, 100, 40]);
        expect(form.recentAverage).toBe(80);
        expect(form.legAverage).toBe(40);
        expect(form.gameAverage).toBe(80);
    });

    it('needs a few visits before it calls a trend', () => {
        expect(formOf(game(), 'b').trend).toBeNull();
    });

    it('sees a player getting better or worse', () => {
        const run = (scores) => {
            let left = 10000;
            return game({ startingScore: 10000, allSetsThrows: {}, currentLegThrows: scores.map(score => visit('a', left -= score)) });
        };
        expect(formOf(run([20, 20, 20, 20, 20, 100, 100, 100, 100, 100]), 'a').trend).toBe('up');
        expect(formOf(run([100, 100, 100, 100, 100, 20, 20, 20, 20, 20]), 'a').trend).toBe('down');
        expect(formOf(run([60, 60, 60, 60, 60, 60]), 'a').trend).toBe('steady');
    });

    it('is empty before the first visit', () => {
        const form = formOf(game({ allSetsThrows: {}, currentLegThrows: [] }), 'a');
        expect(form.visits).toEqual([]);
        expect(form.gameAverage).toBeNull();
        expect(form.trend).toBeNull();
    });
});
