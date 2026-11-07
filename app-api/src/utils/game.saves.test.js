import { describe, expect, it } from 'vitest';
import { FINISHED_SAVE, STALE_SAVE, extendsVisits, saveConflict, sameVisits, unchangedFinish } from './game.saves.js';

const v = (player, ...darts) => ({ player, darts });
const AT = new Date('2026-11-07T19:00:00.000Z');

describe('extendsVisits', () => {
    it('takes the same visits and more', () => {
        expect(extendsVisits([v('a', 'T20')], [v('a', 'T20')])).toBe(true);
        expect(extendsVisits([v('a', 'T20')], [v('a', 'T20'), v('b', 'S1')])).toBe(true);
        expect(extendsVisits([], [v('a', 'S1')])).toBe(true);
    });

    it('ignores empty darts', () => {
        expect(extendsVisits([v('a', 'T20', '', '')], [v('a', 'T20')])).toBe(true);
    });

    it('refuses fewer or other visits', () => {
        expect(extendsVisits([v('a', 'T20'), v('b', 'S1')], [v('a', 'T20')])).toBe(false);
        expect(extendsVisits([v('a', 'T20')], [v('a', 'T19'), v('b', 'S1')])).toBe(false);
        expect(extendsVisits([v('a', 'T20')], [v('b', 'T20')])).toBe(false);
        expect(sameVisits([v('a', 'T20')], [v('a', 'T20'), v('b', 'S1')])).toBe(false);
    });
});

describe('saveConflict', () => {
    const running = { visits: [v('a', 'T20'), v('b', 'S1')], hasWinner: false, updatedAt: AT };
    const won = { visits: [v('a', 'T20'), v('b', 'S1'), v('a', 'D20')], hasWinner: true, updatedAt: AT };

    it('takes more visits of a running game, whatever it built on', () => {
        expect(saveConflict(running, { visits: [...running.visits, v('a', 'S5')] }, '2020-01-01T00:00:00.000Z')).toBeNull();
    });

    it('takes an undo from the device with the newest state', () => {
        expect(saveConflict(running, { visits: [v('a', 'T20')] }, AT.toISOString())).toBeNull();
    });

    it('refuses an older state built on an older one', () => {
        expect(saveConflict(running, { visits: [v('a', 'T20')] }, '2026-11-07T18:59:00.000Z')).toBe(STALE_SAVE);
        expect(saveConflict(running, { visits: [v('a', 'T20'), v('b', 'T20'), v('a', 'S1')] }, '2026-11-07T18:59:00.000Z')).toBe(STALE_SAVE);
    });

    it('keeps taking an app that does not say what it built on', () => {
        expect(saveConflict(running, { visits: [v('a', 'T20')] }, undefined)).toBeNull();
    });

    it('takes a finished game only as it is', () => {
        expect(saveConflict(won, { visits: won.visits, hasWinner: true }, undefined)).toBeNull();
        expect(saveConflict(won, { visits: won.visits.slice(0, -1), hasWinner: false }, AT.toISOString())).toBe(FINISHED_SAVE);
        expect(saveConflict(won, { visits: [...won.visits, v('b', 'S1')], hasWinner: true }, AT.toISOString())).toBe(FINISHED_SAVE);
    });

    it('keeps a finished game stored before visits finished', () => {
        expect(saveConflict({ hasWinner: true }, { visits: [v('a', 'D20')], hasWinner: true })).toBeNull();
        expect(saveConflict({ hasWinner: true }, { visits: [], hasWinner: false })).toBe(FINISHED_SAVE);
    });

    it('takes anything for a running game stored before visits', () => {
        expect(saveConflict({ hasWinner: false }, { visits: [] }, '2020-01-01')).toBeNull();
    });
});

describe('unchangedFinish', () => {
    const won = { players: ['a', 'b'], visits: [v('a', 'D20')], hasWinner: true };

    it('is a finished game sent again as it is', () => {
        expect(unchangedFinish(won, { players: ['a', 'b'], visits: [v('a', 'D20')], hasWinner: true })).toBe(true);
    });

    it('is not a game finished just now or changed', () => {
        expect(unchangedFinish({ ...won, hasWinner: false }, { ...won })).toBe(false);
        expect(unchangedFinish(won, { ...won, visits: [v('a', 'D10')] })).toBe(false);
        expect(unchangedFinish(won, { ...won, players: ['b', 'a'] })).toBe(false);
    });
});
