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

// the welcome tour and the first steps: { tour: 'done' | 'again', firstSteps: 'hidden' | 'shown' }; the user
const setOnboarding = (changes) => requestJSON(API_URL + 'onboarding', { method: 'PUT', body: changes });

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

// two-step login: the code after the password ({ code } or { recoveryCode }, and trust for this device)
const loginMfa = (answer) => requestJSON(API_URL + 'login/mfa', { method: 'POST', body: answer });
// its state, setting it up ({ secret, uri }), turning it on ({ recoveryCodes }) and off
const mfaStatus = () => requestJSON(API_URL + 'mfa');
const mfaSetup = () => requestJSON(API_URL + 'mfa/setup', { method: 'POST' });
const mfaEnable = (code, trust = false) => requestJSON(API_URL + 'mfa/enable', { method: 'POST', body: { code, trust } });
const mfaDisable = (password, code) => requestJSON(API_URL + 'mfa/disable', { method: 'POST', body: { password, code } });
const mfaRecoveryCodes = (code) => requestJSON(API_URL + 'mfa/recovery-codes', { method: 'POST', body: { code } });
const mfaForgetDevices = () => requestJSON(API_URL + 'mfa/forget-devices', { method: 'POST' });

// what stands before deleting the own account: { globalAdmin, clubs: [{ id, name, members, candidates }] }
const deletionSteps = () => requestJSON(API_URL + 'delete-account');

// deletes the own account (the players stay, anonymised); clubs: what happens
// to the clubs it is the only admin of, [{ club, action: 'handover', to } | { club, action: 'delete', name }]
const deleteAccount = (password, code, clubs = []) => requestJSON(API_URL + 'delete-account', { method: 'POST', body: { password, ...(code && { code }), ...(clubs.length && { clubs }) } });

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
    setOnboarding,
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
    saveLanguage,
    changePassword,
    setGamePreferences,
    loginMfa,
    mfaStatus,
    mfaSetup,
    mfaEnable,
    mfaDisable,
    mfaRecoveryCodes,
    mfaForgetDevices,
    deletionSteps,
    deleteAccount,
};

export default AuthService;
