import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/auth/';

/**
 * Returns the logged-in user, or null when nobody is logged in.
 */
const getCurrentUser = async () => {
    try {
        return await requestJSON(API_URL + 'me');
    } catch (error) {
        if (error.status === 401) return null;
        throw error;
    }
};

const login = (email, password) =>
    requestJSON(API_URL + 'login', { method: 'POST', body: { email, password } });

const register = (account) =>
    requestJSON(API_URL + 'register', { method: 'POST', body: account });

const logout = () => requestJSON(API_URL + 'logout', { method: 'POST' });

// the user's own dashboard in a club: the layout [{ id, size }], or null for the club's again; the user
const saveDashboard = (clubId, layout) =>
    requestJSON(`${API_URL}dashboard/${clubId}`, { method: 'PUT', body: { layout } });

const updateProfile = (profile) =>
    requestJSON(API_URL + 'me', { method: 'PUT', body: profile });

// the language of the app, saved on the account; the user
const saveLanguage = (language) =>
    requestJSON(API_URL + 'language', { method: 'PUT', body: { language } });

const changePassword = (currentPassword, newPassword) =>
    requestJSON(API_URL + 'password', { method: 'PUT', body: { currentPassword, newPassword } });

/**
 * Settings the login pages need: whether the server can send mails.
 */
// how the player likes to play, on every device (merged into what the account has)
const setGamePreferences = (preferences) => requestJSON(API_URL + 'game-preferences', { method: 'PUT', body: preferences });

const getConfig = () => requestJSON(API_URL + 'config');

const requestPasswordReset = (email) =>
    requestJSON(API_URL + 'forgot-password', { method: 'POST', body: { email } });

/**
 * Sets a new password with the token from a reset or invitation mail and logs in.
 */
const resetPassword = (token, password) =>
    requestJSON(API_URL + 'reset-password', { method: 'POST', body: { token, password } });

// when the session ends: { expiresAt (ms), timeoutHours }
const getSession = () => requestJSON(API_URL + 'session');

// the session goes on for the full timeout from now: { expiresAt }
const extendSession = () => requestJSON(API_URL + 'session/extend', { method: 'POST' });

// the players the user plays as, with their clubs (for the player profile)
const getMyPlayers = () => requestJSON(API_URL + 'players');

// the player profile changed: the avatar in the menu follows it
export const MY_PLAYERS_CHANGED = 'darts-score:my-players-changed';
export const announceMyPlayersChange = () => window.dispatchEvent(new Event(MY_PLAYERS_CHANGED));

const AuthService = {
    getConfig,
    getMyPlayers,
    getSession,
    extendSession,
    requestPasswordReset,
    resetPassword,
    getCurrentUser,
    login,
    register,
    logout,
    updateProfile,
    saveDashboard,
    saveLanguage,
    changePassword,
    setGamePreferences,
};

export default AuthService;
