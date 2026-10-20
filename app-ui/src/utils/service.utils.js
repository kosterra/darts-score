const { VITE_CF_CLIENT_ID, VITE_CF_CLIENT_SECRET } = import.meta.env;

const ACTIVE_CLUB_KEY = 'darts-score.activeClub';

/**
 * The club the app currently works in. Players, games, training entries and
 * statistics are always requested for this club.
 */
export const getActiveClubId = () => {
    try {
        return localStorage.getItem(ACTIVE_CLUB_KEY) || '';
    } catch {
        return '';
    }
};

export const setActiveClubId = (clubId) => {
    try {
        if (clubId) localStorage.setItem(ACTIVE_CLUB_KEY, clubId);
        else localStorage.removeItem(ACTIVE_CLUB_KEY);
    } catch {
        // storage unavailable (private mode): the choice lasts until reload
    }
};

export const SESSION_ENDED = 'darts-score:session-ended';

export const getHeaders = (addContentTypeJSON = false, clubId = getActiveClubId()) => ({
    ...(addContentTypeJSON && { 'Content-Type': 'application/json' }),
    ...(clubId && { 'X-Club-Id': clubId }),
    ...(VITE_CF_CLIENT_ID && { 'CF-Access-Client-Id': VITE_CF_CLIENT_ID }),
    ...(VITE_CF_CLIENT_SECRET && { 'CF-Access-Client-Secret': VITE_CF_CLIENT_SECRET }),
});

/**
 * JSON request helper for the account, club and user services. Resolves with
 * the parsed response and rejects with the API's own error message.
 */
export const requestJSON = async (url, { method = 'GET', body, clubId } = {}) => {
    const response = await fetch(url, {
        method,
        headers: getHeaders(body !== undefined, clubId),
        ...(body !== undefined && { body: JSON.stringify(body) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        // the session ended (timeout, logged out elsewhere): the app goes back to the login
        if (response.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event(SESSION_ENDED));
        const error = new Error(data.errors?.join(' ') || data.message || response.statusText);
        error.status = response.status;
        throw error;
    }
    return data;
};
