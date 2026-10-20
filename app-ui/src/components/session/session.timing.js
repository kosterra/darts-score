// how long before the end of a session the warning shows: ten minutes, or a
// quarter of a short session
export const warningMs = (timeoutHours) => Math.min(10 * 60 * 1000, (timeoutHours * 60 * 60 * 1000) / 4);

/**
 * What the session needs now: 'ok', 'warn' (ending soon) or 'ended'.
 */
export const sessionPhase = (expiresAt, now, warnMs) => {
    if (!expiresAt) return 'ok';
    if (now >= expiresAt) return 'ended';
    return expiresAt - now <= warnMs ? 'warn' : 'ok';
};

// the time left as 9:05
export const countdown = (ms) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
