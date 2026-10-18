import { useEffect } from 'react';

/**
 * Keeps the screen on while "active", e.g. while a stopwatch runs on a club
 * tablet. Browsers drop the lock when the page is hidden, so it is taken
 * again when the page comes back. Without support nothing happens.
 */
const useWakeLock = (active) => {
    useEffect(() => {
        if (!active || !navigator.wakeLock) return undefined;
        let lock = null;
        let released = false;

        const request = async () => {
            try {
                lock = await navigator.wakeLock.request('screen');
                if (released) lock.release();
            } catch {
                // refused (e.g. battery saver): the screen may turn off
            }
        };
        const onVisible = () => { if (document.visibilityState === 'visible') request(); };

        request();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            released = true;
            document.removeEventListener('visibilitychange', onVisible);
            lock?.release().catch(() => {});
        };
    }, [active]);
};

export default useWakeLock;
