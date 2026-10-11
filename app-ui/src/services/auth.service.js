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

const updateProfile = (profile) =>
    requestJSON(API_URL + 'me', { method: 'PUT', body: profile });

const changePassword = (currentPassword, newPassword) =>
    requestJSON(API_URL + 'password', { method: 'PUT', body: { currentPassword, newPassword } });

/**
 * Settings the login pages need: whether the server can send mails.
 */
const getConfig = () => requestJSON(API_URL + 'config');

const requestPasswordReset = (email) =>
    requestJSON(API_URL + 'forgot-password', { method: 'POST', body: { email } });

/**
 * Sets a new password with the token from a reset or invitation mail and logs in.
 */
const resetPassword = (token, password) =>
    requestJSON(API_URL + 'reset-password', { method: 'POST', body: { token, password } });

const AuthService = {
    getConfig,
    requestPasswordReset,
    resetPassword,
    getCurrentUser,
    login,
    register,
    logout,
    updateProfile,
    changePassword
};

export default AuthService;
