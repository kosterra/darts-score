import { describe, expect, it } from 'vitest';
import { moveItem, offeredPlayers, playedWhen, shuffled, toggled, withStarter } from './player.picker';

const anna = { id: 'a', nickname: 'Anna', firstname: 'Anna', lastname: 'Meier' };
const ben = { id: 'b', nickname: 'Ben', firstname: 'Benjamin', lastname: 'Koch' };
const cleo = { id: 'c', nickname: 'Cleo', firstname: 'Cleo', lastname: 'Huber' };

describe('player picker', () => {
    it('offers the players who played most recently first', () => {
        const lastPlayed = { c: '2026-10-16T10:00:00Z', b: '2026-10-01T10:00:00Z' };
        expect(offeredPlayers([anna, ben, cleo], lastPlayed).map(p => p.id)).toEqual(['c', 'b', 'a']);
    });

    it('searches nickname and full name', () => {
        expect(offeredPlayers([anna, ben, cleo], {}, 'benjamin k').map(p => p.id)).toEqual(['b']);
        expect(offeredPlayers([anna, ben, cleo], {}, 'hub').map(p => p.id)).toEqual(['c']);
    });

    it('says when a player played', () => {
        const now = new Date(2026, 9, 17, 20, 0);
        expect(playedWhen(new Date(2026, 9, 17, 8, 0), now)).toBe('today');
        expect(playedWhen(new Date(2026, 9, 16, 23, 0), now)).toBe('yesterday');
        expect(playedWhen(new Date(2026, 9, 12), now)).toBe('5 days ago');
        expect(playedWhen(new Date(2026, 5, 1), now)).toBeNull();
        expect(playedWhen(null, now)).toBeNull();
    });

    it('adds and removes players, up to four', () => {
        expect(toggled([anna], ben)).toEqual([anna, ben]);
        expect(toggled([anna, ben], anna)).toEqual([ben]);
        expect(toggled([anna, ben], cleo, 2)).toEqual([anna, ben]);
    });

    it('changes the order', () => {
        expect(moveItem([anna, ben, cleo], 2, 0)).toEqual([cleo, anna, ben]);
        expect(moveItem([anna, ben], 0, 5)).toEqual([anna, ben]);
        expect(withStarter([anna, ben, cleo], 'b')).toEqual([ben, anna, cleo]);
        expect(shuffled([anna, ben, cleo], () => 0)).toEqual([ben, cleo, anna]);
    });
});
