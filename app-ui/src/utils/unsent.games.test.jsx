import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { discardUnsent, loadWithUnsent, unsentGame, unsentGames, useGameSaves } from './unsent.games';

// the tests compile JSX the classic way, which needs React at hand
globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// renders the hook: → the latest { save, unsent }
const renderSaves = (key, send, onSent) => {
    const latest = {};
    const Probe = () => {
        Object.assign(latest, useGameSaves(key, send, onSent));
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
        expect(send).toHaveBeenCalledWith({ id: 'g1', visits: [1] });
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
        expect(send).toHaveBeenLastCalledWith({ id: 'g1', visits: [1, 2] });
        expect(unsentGame('x01:g1')).toBeNull();
    });

    it('opens the kept state instead of the server\'s, and alone without a connection', async () => {
        localStorage.setItem('darts-score.unsent-games', JSON.stringify({ 'x01:g1': { game: { id: 'g1', visits: [1, 2] }, players, at: 1 } }));
        const fromServer = await loadWithUnsent('x01:g1', async () => ({ id: 'g1', visits: [1] }), async () => [{ id: 'p1', nickname: 'Anna (server)' }]);
        expect(fromServer).toEqual({ game: { id: 'g1', visits: [1, 2] }, players: [{ id: 'p1', nickname: 'Anna (server)' }], kept: true });
        const offline = await loadWithUnsent('x01:g1', async () => { throw new Error('offline'); }, async () => { throw new Error('offline'); });
        expect(offline).toEqual({ game: { id: 'g1', visits: [1, 2] }, players, kept: true });
        discardUnsent('x01:g1');
        await expect(loadWithUnsent('x01:g1', async () => { throw new Error('offline'); }, async () => players)).rejects.toThrow('offline');
    });
});
