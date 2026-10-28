import { currentLanguage, t, translateAnswer } from './i18n';
const { VITE_CF_CLIENT_ID, VITE_CF_CLIENT_SECRET } = import.meta.env;

const ACTIVE_CLUB_KEY = 'darts-score.activeClub';

/**
 * The club the app currently works in. Players, games, training entries and
 * statistics are always requested for this club.
 */
export const getActiveClubId = () => {
    try {
        // a global admin looking at a club does so in this tab only
        return getVisitedClubId() || localStorage.getItem(ACTIVE_CLUB_KEY) || '';
    } catch {
        return '';
    }
};

// the club a global admin looks at in this tab ({ id, from: the page to go back to }), or null
const VISIT_KEY = 'darts-score.visitClub';
export const getVisit = () => {
    try {
        return JSON.parse(sessionStorage.getItem(VISIT_KEY) ?? 'null');
    } catch {
        return null;
    }
};
export const getVisitedClubId = () => getVisit()?.id ?? '';
export const setVisit = (visit) => {
    try {
        if (visit) sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
        else sessionStorage.removeItem(VISIT_KEY);
    } catch {
        // storage unavailable: the visit lasts until reload
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
    // the messages of the API come in the language of the app
    'Accept-Language': currentLanguage(),
    ...(clubId && { 'X-Club-Id': clubId }),
    ...(VITE_CF_CLIENT_ID && { 'CF-Access-Client-Id': VITE_CF_CLIENT_ID }),
    ...(VITE_CF_CLIENT_SECRET && { 'CF-Access-Client-Secret': VITE_CF_CLIENT_SECRET }),
});

/**
 * JSON request helper for the account, club and user services. Resolves with
 * the parsed response and rejects with the API's own error message.
 */
export const requestJSON = async (url, { method = 'GET', body, clubId } = {}) => {
    let response;
    try {
        response = await fetch(url, {
            method,
            headers: getHeaders(body !== undefined, clubId),
            ...(body !== undefined && { body: JSON.stringify(body) })
        });
    } catch (err) {
        // no answer at all (offline, the address not found, the server gone): said so, not "Failed to fetch"
        const error = new Error(t('No connection to the server. Check your internet connection and try again.'));
        error.offline = true;
        error.cause = err;
        throw error;
    }
    const data = translateAnswer(await response.json().catch(() => ({})));
    if (!response.ok) {
        // the session ended (timeout, logged out elsewhere): the app goes back to the login
        if (response.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event(SESSION_ENDED));
        // without a message of the API (e.g. the error page of a proxy in front), at least the status
        const error = new Error(data.errors?.join(' ') || data.message || response.statusText || t('The server answered with an error ({{status}}). Please try again later.', { status: response.status }));
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
};
