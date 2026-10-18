import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A stopwatch that measures the real time passed: the screen only shows it.
 * Counting timer ticks runs slow when the browser throttles them (a busy or
 * sleeping device), measuring does not.
 */
const useStopwatch = () => {
    // the time of the finished runs, and when the current run started
    const banked = useRef(0);
    const startedAt = useRef(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [running, setRunning] = useState(false);

    const now = () => banked.current + (startedAt.current === null ? 0 : performance.now() - startedAt.current);

    useEffect(() => {
        if (!running) return undefined;
        let frame;
        const tick = () => {
            setElapsedMs(now());
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [running]);

    const start = useCallback(() => {
        if (startedAt.current !== null) return;
        startedAt.current = performance.now();
        setRunning(true);
    }, []);

    // returns the time measured so far
    const stop = useCallback(() => {
        banked.current = now();
        startedAt.current = null;
        setElapsedMs(banked.current);
        setRunning(false);
        return banked.current;
    }, []);

    const reset = useCallback(() => {
        banked.current = 0;
        startedAt.current = null;
        setElapsedMs(0);
        setRunning(false);
    }, []);

    return { elapsedMs, running, start, stop, reset };
};

export default useStopwatch;
