import { describe, expect, it } from 'vitest';
import {
    activeBoards, applyChanges, boardsView, busyPlayers, fill, hold, moveTo, nightItems, queueOf, setBoards, suggestNext, takeOut, topUp, tournamentItems,
} from './boards';
import { bracketMatches, groupMatches } from './tournaments';

const item = (key, players, fields = {}) => ({ key, players, status: 'queued', board: null, held: false, readyAt: null, doneAt: null, stage: 0, ...fields });
const two = { count: 2, out: [] };

describe('the boards played on', () => {
    it('are 1 to the count, without those taken out', () => {
        expect(activeBoards({ count: 4, out: [2] })).toEqual([1, 3, 4]);
        expect(activeBoards({ count: 0, out: [] })).toEqual([]);
        expect(activeBoards(null)).toEqual([]);
    });
});

describe('the queue', () => {
    it('plays the group stage first, then the bigger round', () => {
        const items = [item('final', ['a', 'b'], { stage: 1 / 2 }), item('qf', ['c', 'd'], { stage: 1 / 8 }), item('group', ['e', 'f'], { stage: 0 })];
        expect(queueOf(items).map(entry => entry.key)).toEqual(['group', 'qf', 'final']);
    });

    it('calls whoever waited longest first, someone who never played before anyone', () => {
        const items = [
            item('played', ['a', 'b'], { status: 'done', doneAt: '2026-11-03T19:00:00Z' }),
            item('again', ['a', 'c'], { readyAt: '2026-11-03T18:00:00Z' }),
            item('fresh', ['d', 'e'], { readyAt: '2026-11-03T18:30:00Z' }),
        ];
        expect(queueOf(items).map(entry => entry.key)).toEqual(['fresh', 'again']);
    });

    it('then the one ready earlier, then the order given', () => {
        const items = [item('late', ['a', 'b'], { readyAt: '2026-11-03T19:00:00Z' }), item('early', ['c', 'd'], { readyAt: '2026-11-03T18:00:00Z' }), item('also', ['e', 'f'], { readyAt: '2026-11-03T18:00:00Z' })];
        expect(queueOf(items).map(entry => entry.key)).toEqual(['early', 'also', 'late']);
    });

    it('has only matches with both players known, not held back and without a board', () => {
        const items = [item('open', ['a', null]), item('held', ['b', 'c'], { held: true }), item('called', ['d', 'e'], { status: 'called', board: 1 }), item('ok', ['f', 'g'])];
        expect(queueOf(items).map(entry => entry.key)).toEqual(['ok']);
    });
});

describe('filling the boards', () => {
    it('calls the queue to the free boards in number order', () => {
        expect(fill(two, [item('m1', ['a', 'b']), item('m2', ['c', 'd']), item('m3', ['e', 'f'])])).toEqual([{ key: 'm1', board: 1 }, { key: 'm2', board: 2 }]);
    });

    it('never puts a player on two boards (a group plays one match of a player at a time)', () => {
        const items = [item('m1', ['a', 'b']), item('m2', ['a', 'c']), item('m3', ['d', 'e'])];
        expect(fill(two, items)).toEqual([{ key: 'm1', board: 1 }, { key: 'm3', board: 2 }]);
        // a player busy on a board stays there
        expect(fill(two, [item('m1', ['a', 'b'], { status: 'playing', board: 1 }), item('m2', ['a', 'c'])])).toEqual([]);
    });

    it('leaves out boards taken out and boards in use', () => {
        const items = [item('on', ['a', 'b'], { status: 'called', board: 1 }), item('m2', ['c', 'd']), item('m3', ['e', 'f'])];
        expect(fill({ count: 3, out: [2] }, items)).toEqual([{ key: 'm2', board: 3 }]);
    });

    it('fills a board again once its match is decided', () => {
        const items = [item('m1', ['a', 'b'], { status: 'done', board: 1, doneAt: '2026-11-03T19:00:00Z' }), item('m2', ['c', 'd'], { status: 'playing', board: 2 }), item('m3', ['e', 'f'])];
        expect(fill(two, items)).toEqual([{ key: 'm3', board: 1 }]);
    });

    it('takes a player out of a game without a board into account', () => {
        expect(fill(two, [item('m1', ['a', 'b'], { status: 'playing' }), item('m2', ['a', 'c'])])).toEqual([]);
        expect([...busyPlayers([item('m1', ['a', 'b'], { status: 'playing' })])]).toEqual(['a', 'b']);
    });
});

describe('setting and taking out boards', () => {
    it('sends a match called to a board taken out back to the queue, first again', () => {
        const items = [
            item('m1', ['a', 'b'], { status: 'called', board: 1, readyAt: '2026-11-03T18:00:00Z' }),
            item('m2', ['c', 'd'], { status: 'called', board: 2, readyAt: '2026-11-03T18:10:00Z' }),
            item('m3', ['e', 'f'], { readyAt: '2026-11-03T18:20:00Z' }),
        ];
        const { boards, changes } = takeOut({ count: 3, out: [] }, items, 1);
        expect(boards).toEqual({ count: 3, out: [1] });
        // m1 back, then the free board 3 takes it (it waited longest)
        expect(changes).toEqual([{ key: 'm1', board: null }, { key: 'm1', board: 3 }]);
    });

    it('lets a game going on finish on a board taken out', () => {
        const items = [item('m1', ['a', 'b'], { status: 'playing', board: 1 }), item('m2', ['c', 'd'])];
        const { changes } = takeOut(two, items, 1);
        expect(changes).toEqual([{ key: 'm2', board: 2 }]);
        // and it is not called again
        const after = applyChanges(items, [...changes, { key: 'm1', status: 'done' }]);
        expect(fill({ count: 2, out: [1] }, [...after, item('m3', ['e', 'f'])])).toEqual([]);
    });

    it('fills new boards when the count goes up, and empties the boards that go', () => {
        const items = [item('m1', ['a', 'b'], { status: 'called', board: 1 }), item('m2', ['c', 'd'])];
        expect(setBoards(items, { count: 2, out: [] }).changes).toEqual([{ key: 'm2', board: 2 }]);
        const fewer = setBoards([item('m1', ['a', 'b'], { status: 'called', board: 2 })], { count: 1, out: [2, 5] });
        expect(fewer.boards).toEqual({ count: 1, out: [] });
        expect(fewer.changes).toEqual([{ key: 'm1', board: null }, { key: 'm1', board: 1 }]);
    });
});

describe('moving a match to a board', () => {
    const items = [
        item('m1', ['a', 'b'], { status: 'called', board: 1 }),
        item('m2', ['c', 'd'], { status: 'playing', board: 2 }),
        item('m3', ['e', 'f']),
        item('m4', ['a', 'g']),
    ];
    const three = { count: 3, out: [] };

    it('moves to a free board', () => {
        expect(moveTo(three, items, 'm1', 3)).toEqual({ changes: [{ key: 'm1', board: 3, held: false }] });
        expect(moveTo(three, items, 'm3', 3)).toEqual({ changes: [{ key: 'm3', board: 3, held: false }] });
    });

    it('swaps with a match not started yet', () => {
        expect(moveTo(three, items, 'm3', 1)).toEqual({ changes: [{ key: 'm3', board: 1, held: false }, { key: 'm1', board: null }] });
        const both = [...items, item('m5', ['h', 'i'], { status: 'called', board: 3 })];
        expect(moveTo(three, both, 'm5', 1)).toEqual({ changes: [{ key: 'm5', board: 1, held: false }, { key: 'm1', board: 3 }] });
    });

    it('refuses a board out, a game going on, and a player on two boards', () => {
        expect(moveTo({ count: 3, out: [3] }, items, 'm3', 3).error).toBeTruthy();
        expect(moveTo(three, items, 'm3', 4).error).toBeTruthy();
        expect(moveTo(three, items, 'm3', 2).error).toBeTruthy();
        expect(moveTo(three, items, 'm4', 3).error).toBeTruthy();
        // swapping m1 away lets m4 (with a of m1) take board 1
        expect(moveTo(three, items, 'm4', 1).changes).toEqual([{ key: 'm4', board: 1, held: false }, { key: 'm1', board: null }]);
    });
});

describe('holding a match back', () => {
    it('takes it off its board and calls the next one', () => {
        const items = [item('m1', ['a', 'b'], { status: 'called', board: 1 }), item('m2', ['c', 'd'])];
        expect(hold({ count: 1, out: [] }, items, 'm1', true).changes).toEqual([{ key: 'm1', held: true, board: null }, { key: 'm2', board: 1 }]);
    });

    it('is skipped by the queue until it is let in again', () => {
        const items = [item('m1', ['a', 'b'], { held: true }), item('m2', ['c', 'd'])];
        expect(fill({ count: 1, out: [] }, items)).toEqual([{ key: 'm2', board: 1 }]);
        expect(hold(two, items, 'm1', false).changes).toEqual([{ key: 'm1', held: false }, { key: 'm1', board: 1 }, { key: 'm2', board: 2 }]);
    });

    it('refuses a game going on', () => {
        expect(hold(two, [item('m1', ['a', 'b'], { status: 'playing', board: 1 })], 'm1', true).error).toBeTruthy();
    });
});

describe('a club night on boards', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

    it('keeps as many pairings waiting as boards are played on', () => {
        expect(topUp({ boards: two, players, entries: [] })).toEqual([['p1', 'p2'], ['p3', 'p4']]);
        const entries = [{ players: ['p1', 'p2'], status: 'called' }, { players: ['p3', 'p4'], status: 'called' }];
        expect(topUp({ boards: two, players, entries })).toEqual([['p5', 'p6']]);
    });

    it('pairs players who have not met yet', () => {
        const entries = [
            { players: ['p1', 'p2'], status: 'done' }, { players: ['p3', 'p4'], status: 'done' },
            { players: ['p5', 'p6'], status: 'playing' },
        ];
        const pairs = topUp({ boards: { count: 1, out: [] }, players, entries });
        expect(pairs).toHaveLength(1);
        expect(['p1|p3', 'p1|p4', 'p2|p3', 'p2|p4']).toContain([...pairs[0]].sort().join('|'));
    });

    it('does not pair a cancelled pairing again at once', () => {
        const entries = [{ players: ['p1', 'p2'], status: 'cancelled' }];
        expect(topUp({ boards: { count: 1, out: [] }, players: ['p1', 'p2', 'p3'], entries })[0]).toContain('p3');
    });

    it('waits when everyone is on a board or waiting', () => {
        const entries = [{ players: ['p1', 'p2'], status: 'playing' }, { players: ['p3', 'p4'], status: 'queued' }];
        expect(topUp({ boards: two, players: ['p1', 'p2', 'p3', 'p4'], entries })).toEqual([]);
        expect(topUp({ boards: { count: 0, out: [] }, players, entries: [] })).toEqual([]);
    });
});

describe('the hosts as items', () => {
    it('maps a bracket: byes left out, ready with a board is called', () => {
        const matches = bracketMatches({ size: 4, slots: ['a', 'b', 'c', null] });
        matches[0].board = 1;
        const items = tournamentItems({ matches });
        expect(items.map(entry => [entry.key, entry.status, entry.board])).toEqual([['4-0', 'called', 1], ['2-0', 'waiting', null]]);
    });

    it('plays the groups before the bracket, one match of a player at a time', () => {
        const matches = [...groupMatches([['a', 'b', 'c', 'd']]), ...bracketMatches({ size: 2, slots: [null, null] })];
        const items = tournamentItems({ matches });
        const calls = fill({ count: 4, out: [] }, items);
        expect(calls).toHaveLength(2);
        const onBoards = calls.flatMap(call => items.find(entry => entry.key === call.key).players);
        expect(new Set(onBoards).size).toBe(4);
    });

    it('maps the entries of a night, a cancelled one as done', () => {
        const items = nightItems({ entries: [{ id: 'e1', players: ['a', 'b'], status: 'cancelled', doneAt: '2026-11-03T19:00:00Z' }, { id: 'e2', players: ['c', 'd'], status: 'queued' }] });
        expect(items.map(entry => [entry.key, entry.status, entry.doneAt])).toEqual([['e1', 'done', null], ['e2', 'queued', null]]);
    });

    it('shows each board with its match, the queue and those held back', () => {
        const items = [item('m1', ['a', 'b'], { status: 'playing', board: 2 }), item('m2', ['c', 'd']), item('m3', ['e', 'f'], { held: true })];
        expect(boardsView({ count: 3, out: [3] }, items)).toEqual({
            count: 3,
            out: [3],
            boards: [{ number: 1, out: false, key: null, status: 'free' }, { number: 2, out: false, key: 'm1', status: 'playing' }, { number: 3, out: true, key: null, status: 'out' }],
            queue: ['m2'],
            held: ['m3'],
        });
    });
});

describe('the next game of an evening (moved here from utils/evening.next.js)', () => {
    it('leaves out the players of a game going on', () => {
        const players = ['q1', 'q2', 'q3', 'q4'].map(id => ({ id }));
        expect(suggestNext(players, [{ players: ['q1', 'q2'], running: true }, { players: ['q3', 'q4'] }])).toEqual(['q3', 'q4']);
    });
});
