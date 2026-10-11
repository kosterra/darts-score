import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/clubs';

const loadClubs = () => requestJSON(API_URL);

const createClub = (name) => requestJSON(API_URL, { method: 'POST', body: { name } });

/**
 * Saves a club's name and what it shows on the public start page:
 * { name, isPublic, publicLiveGames, publicResults }.
 */
const updateClub = (clubId, settings) => requestJSON(`${API_URL}/${clubId}`, { method: 'PUT', body: settings });

const deleteClub = (clubId) => requestJSON(`${API_URL}/${clubId}`, { method: 'DELETE' });

/**
 * The player a user plays as in a club, or null when they are not a player there.
 */
const findPlayerOfUser = async (clubId, userId) => {
    const players = await requestJSON('/api/players', { clubId });
    return players.find(player => player.user === userId) ?? null;
};

/**
 * Adds the logged-in user as a player of a club.
 */
const addCurrentUserAsPlayer = (clubId, nickname) =>
    requestJSON('/api/players/me', { method: 'POST', body: { nickname }, clubId });

/**
 * Makes the account with this email an admin of the club. For an email without
 * an account, firstname and lastname create one; without an initial password
 * the new admin gets a mail to choose their own.
 */
const addAdmin = (clubId, admin) =>
    requestJSON(`${API_URL}/${clubId}/admins`, { method: 'POST', body: admin });

const removeAdmin = (clubId, userId) =>
    requestJSON(`${API_URL}/${clubId}/admins/${userId}`, { method: 'DELETE' });

const ClubService = {
    addAdmin,
    removeAdmin,
    loadClubs,
    createClub,
    updateClub,
    deleteClub,
    findPlayerOfUser,
    addCurrentUserAsPlayer
};

export default ClubService;
