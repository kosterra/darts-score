import { useEffect, useRef } from 'react';

import useGamePreferences from '../../../utils/use.game.preferences';

// a moment to see the third dart before the visit goes
const AUTO_SEND_MS = 450;

/**
 * The player's preference to send a visit by itself once its third dart is
 * in: then the score button (#submitThrows) is pressed for them. darts: the
 * darts of the visit as entered ('' for none yet).
 */
const useAutoSend = (darts) => {
    const [preferences] = useGamePreferences();
    const filled = (darts ?? []).filter(dart => dart !== '' && dart != null).length;
    const before = useRef(filled);
    useEffect(() => {
        const third = filled === 3 && before.current < 3;
        before.current = filled;
        if (!preferences.autoSend || !third) return undefined;
        const timer = setTimeout(() => document.getElementById('submitThrows')?.click(), AUTO_SEND_MS);
        return () => clearTimeout(timer);
    }, [filled, preferences.autoSend]);
};

export default useAutoSend;
