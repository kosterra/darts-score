import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/users';

const loadUsers = () => requestJSON(API_URL);

const updateRole = (userId, role) =>
    requestJSON(`${API_URL}/${userId}/role`, { method: 'PUT', body: { role } });

const deleteUser = (userId) => requestJSON(`${API_URL}/${userId}`, { method: 'DELETE' });

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
    deleteUser
};

export default UserService;
