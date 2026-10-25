// A darts evening to be made a club once the account is there (after logging
// in or registering), kept for the tab like a claim link.
const KEY = 'darts-score.pendingEvening';

export const setPendingEvening = (id) => {
    try {
        sessionStorage.setItem(KEY, id);
    } catch {
        // without storage the evening's page offers it again
    }
};

export const peekPendingEvening = () => {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
};

export const clearPendingEvening = () => {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        // nothing kept
    }
};
