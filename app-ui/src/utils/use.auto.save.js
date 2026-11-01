import { useCallback, useEffect, useRef, useState } from 'react';

// a moment after the last change: long enough for a word typed, short enough to feel at once
export const SAVE_AFTER_MS = 700;

/**
 * Saving as you go, the one way settings and edits save in Legmate (see the
 * style guide): the page shows a change at once and calls change(value); it
 * is saved a moment later, or at once with change(value, { now: true }) for
 * a choice (a switch, a pill, a list). One save at a time, the newest value
 * wins; a change still waiting is saved when the page is left or hidden. A
 * value that valid() refuses is not sent (the field says what is wrong).
 *
 * save(value) returns a promise; status: 'idle' | 'saving' | 'saved' |
 * 'error' (with error), retry() sends the last value again. Show it with
 * <SaveStatus {...autosave} />.
 */
const useAutoSave = (save, { delay = SAVE_AFTER_MS, valid = () => true } = {}) => {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    const saveRef = useRef(save);
    const validRef = useRef(valid);
    saveRef.current = save;
    validRef.current = valid;
    const timer = useRef(null);
    // the value waiting to be saved (wrapped, so undefined and null can be saved too)
    const pending = useRef(null);
    const last = useRef(null);
    const running = useRef(false);
    const mounted = useRef(true);

    const run = useCallback(async () => {
        clearTimeout(timer.current);
        timer.current = null;
        if (running.current || !pending.current) return;
        const { value } = pending.current;
        pending.current = null;
        last.current = { value };
        running.current = true;
        if (mounted.current) setStatus('saving');
        try {
            await saveRef.current(value);
            if (mounted.current && !pending.current) {
                setStatus('saved');
                setError(null);
            }
        } catch (failed) {
            if (mounted.current) {
                setStatus('error');
                setError(failed);
            }
        } finally {
            running.current = false;
            // what changed while this one was on its way
            if (pending.current && !timer.current) run();
        }
    }, []);

    const change = useCallback((value, { now = false } = {}) => {
        if (!validRef.current(value)) {
            // nothing to send; an earlier value still waiting is dropped with it
            pending.current = null;
            clearTimeout(timer.current);
            timer.current = null;
            setStatus('idle');
            return;
        }
        pending.current = { value };
        setStatus('saving');
        clearTimeout(timer.current);
        if (now) run();
        else timer.current = setTimeout(run, delay);
    }, [delay, run]);

    const flush = useCallback(() => {
        if (pending.current) run();
    }, [run]);

    const retry = useCallback(() => {
        if (!last.current) return;
        pending.current = pending.current ?? last.current;
        run();
    }, [run]);

    // leaving the page or hiding it (a phone locked, the app switched) saves what is still waiting
    useEffect(() => {
        mounted.current = true;
        const hidden = () => document.visibilityState === 'hidden' && flush();
        document.addEventListener('visibilitychange', hidden);
        return () => {
            document.removeEventListener('visibilitychange', hidden);
            mounted.current = false;
            if (pending.current) {
                clearTimeout(timer.current);
                saveRef.current(pending.current.value)?.catch?.(() => {});
                pending.current = null;
            }
        };
    }, [flush]);

    return { status, error, change, flush, retry };
};

export default useAutoSave;

// several saves of one section shown as one status: what went wrong first, then what is still saving
const ORDER = ['error', 'saving', 'saved', 'idle'];
export const mergeSaves = (...saves) => {
    const shown = saves.filter(Boolean).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))[0];
    return shown ?? { status: 'idle' };
};
