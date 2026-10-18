import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/users';

const loadUsers = () => requestJSON(API_URL);

const updateRole = (userId, role) =>
    requestJSON(`${API_URL}/${userId}/role`, { method: 'PUT', body: { role } });

const deleteUser = (userId) => requestJSON(`${API_URL}/${userId}`, { method: 'DELETE' });

// for users who cannot help themselves: correct the account, set a password,
// or get a "choose your password" link to pass on
const updateUser = (userId, account) => requestJSON(`${API_URL}/${userId}`, { method: 'PUT', body: account });
const setPassword = (userId, password) => requestJSON(`${API_URL}/${userId}/password`, { method: 'PUT', body: { password } });
const createPasswordLink = (userId) => requestJSON(`${API_URL}/${userId}/password-link`, { method: 'POST' });

export const ROLES = {
    GLOBAL_ADMIN: 'globalAdmin',
    USER: 'user'
};

export const ROLE_LABELS = {
    [ROLES.GLOBAL_ADMIN]: 'Global admin',
    [ROLES.USER]: 'User'
};

// What a user is in one particular club
export const CLUB_ROLES = {
    ADMIN: 'admin',
    PLAYER: 'player'
};

const UserService = {
    loadUsers,
    updateRole,
    deleteUser,
    updateUser,
    setPassword,
    createPasswordLink,
};

export default UserService;
