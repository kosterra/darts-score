// A claim link opened before logging in or registering: kept for the tab, so
// the player is taken over once the account is there (also after the app
// reloads in the account's language).
const KEY = 'darts-score.pendingClaim';

export const setPendingClaim = (token) => {
    try {
        sessionStorage.setItem(KEY, token);
    } catch {
        // without storage the link is simply opened again
    }
};

export const peekPendingClaim = () => {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
};

export const clearPendingClaim = () => {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        // nothing kept
    }
};
