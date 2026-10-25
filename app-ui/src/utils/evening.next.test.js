import { describe, expect, it } from 'vitest';
import { suggestNext } from './evening.next';

const players = ['q1', 'q2', 'q3', 'q4'].map(id => ({ id }));

describe('the next game of an evening', () => {
    it('starts with the first players', () => {
        expect(suggestNext(players, [])).toEqual(['q1', 'q2']);
        expect(suggestNext(players, [], 3)).toEqual(['q1', 'q2', 'q3']);
    });

    it('brings in whoever played least, in pairings that did not happen yet', () => {
        expect(suggestNext(players, [{ players: ['q1', 'q2'] }])).toEqual(['q3', 'q4']);
        expect(suggestNext(players, [{ players: ['q1', 'q2'] }, { players: ['q3', 'q4'] }])).toEqual(['q1', 'q3']);
    });

    it('leaves out the players of a game going on', () => {
        expect(suggestNext(players, [{ players: ['q1', 'q2'], running: true }, { players: ['q3', 'q4'] }])).toEqual(['q3', 'q4']);
    });

    it('takes everyone when the evening is small', () => {
        expect(suggestNext(players.slice(0, 2), [], 4)).toEqual(['q1', 'q2']);
    });
});
