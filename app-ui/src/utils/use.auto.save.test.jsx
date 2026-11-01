import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useAutoSave from './use.auto.save';

// the tests compile JSX the classic way, which needs React at hand
globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// renders the hook: → { latest (the hook's last answer), unmount }
const renderHook = (save, options) => {
    const latest = {};
    const Probe = () => {
        Object.assign(latest, useAutoSave(save, options));
        return null;
    };
    const root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
    return { latest, unmount: () => act(() => root.unmount()) };
};

describe('saving as you go', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('saves a moment after the last change, the newest value only', async () => {
        const save = vi.fn(() => Promise.resolve());
        const { latest } = renderHook(save);
        act(() => { latest.change('A'); latest.change('An'); latest.change('Anna'); });
        expect(latest.status).toBe('saving');
        expect(save).not.toHaveBeenCalled();
        await act(async () => { await vi.advanceTimersByTimeAsync(700); });
        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith('Anna');
        expect(latest.status).toBe('saved');
    });

    it('saves a choice at once', async () => {
        const save = vi.fn(() => Promise.resolve());
        const { latest } = renderHook(save);
        await act(async () => { latest.change(true, { now: true }); });
        expect(save).toHaveBeenCalledWith(true);
        expect(latest.status).toBe('saved');
    });

    it('sends one at a time: a change during a save follows it', async () => {
        let finish;
        const save = vi.fn(() => new Promise(resolve => { finish = resolve; }));
        const { latest } = renderHook(save);
        await act(async () => { latest.change(1, { now: true }); });
        await act(async () => { latest.change(2, { now: true }); latest.change(3, { now: true }); });
        expect(save).toHaveBeenCalledTimes(1);
        await act(async () => { finish(); });
        expect(save).toHaveBeenCalledTimes(2);
        expect(save).toHaveBeenLastCalledWith(3);
        await act(async () => { finish(); });
        expect(latest.status).toBe('saved');
    });

    it('says what went wrong, and tries again', async () => {
        const save = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce();
        const { latest } = renderHook(save);
        await act(async () => { latest.change('x', { now: true }); });
        expect(latest.status).toBe('error');
        expect(latest.error.message).toBe('Offline');
        await act(async () => { latest.retry(); });
        expect(save).toHaveBeenCalledTimes(2);
        expect(latest.status).toBe('saved');
    });

    it('does not send what is not valid', async () => {
        const save = vi.fn(() => Promise.resolve());
        const { latest } = renderHook(save, { valid: (value) => value.length >= 3 });
        act(() => latest.change('An'));
        await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
        expect(save).not.toHaveBeenCalled();
        expect(latest.status).toBe('idle');
    });

    it('saves what is still waiting when the page is left', () => {
        const save = vi.fn(() => Promise.resolve());
        const { latest, unmount } = renderHook(save);
        act(() => latest.change('Anna'));
        unmount();
        expect(save).toHaveBeenCalledWith('Anna');
    });
});
