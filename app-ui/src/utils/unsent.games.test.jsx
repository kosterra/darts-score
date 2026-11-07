import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { discardUnsent, loadWithUnsent, outdatedBy, unsentGame, unsentGames, useGameSaves } from './unsent.games';

// the tests compile JSX the classic way, which needs React at hand
globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// renders the hook: → the latest { save, unsent }
const renderSaves = (key, send, onSent, onRefused) => {
    const latest = {};
    const Probe = () => {
        Object.assign(latest, useGameSaves(key, send, onSent, onRefused));
        return null;
    };
    act(() => createRoot(document.createElement('div')).render(<Probe />));
    return latest;
};

const players = [{ id: 'p1', nickname: 'Anna' }];

describe('games scored without a connection', () => {
    beforeEach(() => localStorage.clear());

    it('drops a state once the server has it', async () => {
        const send = vi.fn().mockResolvedValue(true);
        const onSent = vi.fn();
        const saves = renderSaves('x01:g1', send, onSent);
        await act(() => saves.save({ id: 'g1', visits: [1] }, { players, kind: 'X01' }));
        expect(send).toHaveBeenCalledWith({ id: 'g1', visits: [1] }, { basedOn: undefined });
        expect(onSent).toHaveBeenCalledWith({ id: 'g1', visits: [1] });
        expect(unsentGame('x01:g1')).toBeNull();
        expect(saves.unsent).toBe(false);
    });

    it('keeps the newest state while the save fails, and sends it when it goes through', async () => {
        const send = vi.fn().mockRejectedValue(new Error('offline'));
        const saves = renderSaves('x01:g1', send);
        await act(() => saves.save({ id: 'g1', visits: [1] }, { players }));
        await act(() => saves.save({ id: 'g1', visits: [1, 2] }, { players }));
        expect(saves.unsent).toBe(true);
        expect(unsentGame('x01:g1')).toMatchObject({ game: { visits: [1, 2] }, players });
        expect(unsentGames()).toHaveLength(1);

        send.mockResolvedValue(true);
        await act(async () => {
            window.dispatchEvent(new Event('online'));
            await new Promise(resolve => setTimeout(resolve, 0));
        });
        expect(saves.unsent).toBe(false);
        expect(send).toHaveBeenLastCalledWith({ id: 'g1', visits: [1, 2] }, { basedOn: undefined });
        expect(unsentGame('x01:g1')).toBeNull();
    });

    it('opens the kept state instead of the server\'s, and alone without a connection', async () => {
        localStorage.setItem('darts-score.unsent-games', JSON.stringify({ 'x01:g1': { game: { id: 'g1', visits: [1, 2] }, players, at: 1 } }));
        const fromServer = await loadWithUnsent('x01:g1', async () => ({ id: 'g1', visits: [1] }), async () => [{ id: 'p1', nickname: 'Anna (server)' }]);
        expect(fromServer).toEqual({ game: { id: 'g1', visits: [1, 2] }, players: [{ id: 'p1', nickname: 'Anna (server)' }], kept: true, dropped: false });
        const offline = await loadWithUnsent('x01:g1', async () => { throw new Error('offline'); }, async () => { throw new Error('offline'); });
        expect(offline).toEqual({ game: { id: 'g1', visits: [1, 2] }, players, kept: true, dropped: false });
        discardUnsent('x01:g1');
        await expect(loadWithUnsent('x01:g1', async () => { throw new Error('offline'); }, async () => players)).rejects.toThrow('offline');
    });
});

const visit = (player, ...darts) => ({ player, darts });
const refused = (status, message = 'refused') => Object.assign(new Error(message), { status });
const keepState = (key, entry) => localStorage.setItem('darts-score.unsent-games', JSON.stringify({ [key]: { players, at: 1, ...entry } }));

describe('saves the server refuses', () => {
    beforeEach(() => localStorage.clear());

    it('says which stored state each save builds on, and moves on with the server', async () => {
        await loadWithUnsent('x01:b1', async () => ({ id: 'b1', visits: [], updatedAt: 't0' }), async () => players);
        const send = vi.fn()
            .mockResolvedValueOnce({ updatedAt: 't1' })
            .mockResolvedValueOnce({ updatedAt: 't2' });
        const saves = renderSaves('x01:b1', send);
        await act(() => saves.save({ id: 'b1', visits: [visit('a', 'T20')] }));
        await act(() => saves.save({ id: 'b1', visits: [] }));
        expect(send.mock.calls.map(call => call[1])).toEqual([{ basedOn: 't0' }, { basedOn: 't1' }]);
    });

    it('drops the kept state on a refusal, tells the page and does not try again', async () => {
        vi.useFakeTimers();
        try {
            const send = vi.fn().mockRejectedValue(refused(409, 'This game was changed on another device meanwhile.'));
            const onRefused = vi.fn();
            const onSent = vi.fn();
            const saves = renderSaves('x01:b2', send, onSent, onRefused);
            await act(() => saves.save({ id: 'b2', visits: [visit('a', 'S1')] }, { players }));
            expect(onRefused).toHaveBeenCalledWith(expect.objectContaining({ status: 409 }), expect.anything());
            expect(onSent).not.toHaveBeenCalled();
            expect(unsentGame('x01:b2')).toBeNull();
            expect(saves.unsent).toBe(false);
            await act(async () => { vi.advanceTimersByTime(30000); });
            expect(send).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it.each([404, 422])('gives up on a save answered %i', async (status) => {
        const send = vi.fn().mockRejectedValue(refused(status));
        const onRefused = vi.fn();
        const saves = renderSaves(`x01:gone${status}`, send, undefined, onRefused);
        await act(() => saves.save({ id: 'g', visits: [] }, { players }));
        expect(onRefused).toHaveBeenCalledTimes(1);
        expect(unsentGame(`x01:gone${status}`)).toBeNull();
    });

    it('keeps trying while there is no connection', async () => {
        const send = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
        const onRefused = vi.fn();
        const saves = renderSaves('x01:b3', send, undefined, onRefused);
        await act(() => saves.save({ id: 'b3', visits: [] }, { players }));
        expect(onRefused).not.toHaveBeenCalled();
        expect(unsentGame('x01:b3')).not.toBeNull();
        expect(saves.unsent).toBe(true);
    });

    it('opens nothing for a won state taken back before it got through', async () => {
        let release;
        const send = vi.fn().mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockResolvedValue({});
        const onSent = vi.fn();
        const saves = renderSaves('clock:b4', send, onSent);
        let first;
        act(() => { first = saves.save({ id: 'b4', hasWinner: true, visits: [visit('a', 'S1')] }, { players }); });
        await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
        // taken back while the winning save is on its way
        let second;
        act(() => { second = saves.save({ id: 'b4', hasWinner: false, visits: [] }, { players }); });
        await act(async () => { release({}); await first; await second; });
        expect(onSent).toHaveBeenCalledTimes(1);
        expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ hasWinner: false }));
    });

    it('does not open a kept state of a game gone from the server', async () => {
        keepState('x01:b5', { game: { id: 'b5', visits: [visit('a', 'S1')] } });
        await expect(loadWithUnsent('x01:b5', async () => { throw refused(404, 'Not Found'); }, async () => players)).rejects.toThrow('Not Found');
        expect(unsentGame('x01:b5')).toBeNull();
    });

    it('drops a kept state the server has moved on from', async () => {
        keepState('x01:b6', { game: { id: 'b6', visits: [visit('a', 'S1')] }, basedOn: 't0' });
        const server = { id: 'b6', visits: [visit('a', 'S1'), visit('b', 'S5')], updatedAt: 't1' };
        const loaded = await loadWithUnsent('x01:b6', async () => server, async () => players);
        expect(loaded).toMatchObject({ game: server, kept: false, dropped: true });
        expect(unsentGame('x01:b6')).toBeNull();
    });

    it('keeps a kept state that goes on from the server\'s, or takes back on the newest one', async () => {
        keepState('x01:b7', { game: { id: 'b7', visits: [visit('a', 'S1'), visit('b', 'S5')] }, basedOn: 't0' });
        const ahead = await loadWithUnsent('x01:b7', async () => ({ id: 'b7', visits: [visit('a', 'S1')], updatedAt: 't1' }), async () => players);
        expect(ahead).toMatchObject({ kept: true, dropped: false });
        keepState('x01:b8', { game: { id: 'b8', visits: [] }, basedOn: '2026-11-07T19:00:00.000Z' });
        const undone = await loadWithUnsent('x01:b8', async () => ({ id: 'b8', visits: [visit('a', 'S1')], updatedAt: '2026-11-07T19:00:00.000Z' }), async () => players);
        expect(undone).toMatchObject({ kept: true, dropped: false });
    });
});

describe('outdatedBy', () => {
    const server = { visits: [visit('a', 'S1')], updatedAt: '2026-11-07T19:00:00.000Z' };

    it('is a kept state that takes back on an older state', () => {
        expect(outdatedBy(server, { game: { visits: [] }, basedOn: '2026-11-07T18:00:00.000Z' })).toBe(true);
        expect(outdatedBy(server, { game: { visits: [] } })).toBe(true);
        expect(outdatedBy(server, { game: { visits: [] }, basedOn: '2026-11-07T19:00:00.000Z' })).toBe(false);
    });

    it('is any other state of a game finished on the server', () => {
        const won = { ...server, hasWinner: true };
        expect(outdatedBy(won, { game: { visits: [visit('a', 'S1')] } })).toBe(false);
        expect(outdatedBy(won, { game: { visits: [visit('a', 'S1'), visit('b', 'S1')] }, basedOn: server.updatedAt })).toBe(true);
    });

    it('is no state without the server\'s', () => {
        expect(outdatedBy(undefined, { game: { visits: [] } })).toBe(false);
    });
});
