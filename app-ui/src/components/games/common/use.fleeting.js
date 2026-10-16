import { useEffect, useState } from 'react';

const LEAVE_MS = 250;

/**
 * Keeps a game animation short and out of the way: it ends after "duration"
 * ms, or fades out at once when someone clicks, taps or types, so the next
 * player never waits. Returns whether it is fading out.
 */
const useFleeting = (active, onDone, duration) => {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!active) return undefined;
        setLeaving(false);
        let leaveTimer;
        const timer = setTimeout(onDone, duration);
        const makeRoom = () => {
            setLeaving(true);
            clearTimeout(timer);
            leaveTimer = setTimeout(onDone, LEAVE_MS);
        };
        // the click that confirmed the visit is already over, so listening starts now
        window.addEventListener('pointerdown', makeRoom, { once: true, capture: true });
        window.addEventListener('keydown', makeRoom, { once: true, capture: true });
        return () => {
            clearTimeout(timer);
            clearTimeout(leaveTimer);
            window.removeEventListener('pointerdown', makeRoom, { capture: true });
            window.removeEventListener('keydown', makeRoom, { capture: true });
        };
    }, [active, onDone, duration]);

    return leaving;
};

export default useFleeting;
