import { translateAnswer } from '../utils/i18n';
import { getHeaders, requestJSON } from '../utils/service.utils';

const API_URL = '/api/clubs';

const loadClubs = () => requestJSON(API_URL);

const createClub = (name) => requestJSON(API_URL, { method: 'POST', body: { name } });

/**
 * Saves a club's name and what it shows on the public start page:
 * { name, isPublic, publicLiveGames, publicResults }.
 */
const updateClub = (clubId, settings) => requestJSON(`${API_URL}/${clubId}`, { method: 'PUT', body: settings });
// the club shirt (club admins): { pattern, color, accent, logo }
const updateShirt = (clubId, shirt) => requestJSON(`${API_URL}/${clubId}/shirt`, { method: 'PUT', body: shirt });
// the club's own rules for its games (see rules/club.rules.js)
const updateGameRules = (clubId, rules) => requestJSON(`${API_URL}/${clubId}/game-rules`, { method: 'PUT', body: rules });

// the club's goals: [{ id?, metric, target, until }], at most three; answers with how far each is
const updateGoals = (clubId, goals) => requestJSON(`${API_URL}/${clubId}/goals`, { method: 'PUT', body: { goals } });

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

/**
 * Uploads a new logo for the club (a .png or .jpg file).
 */
const uploadLogo = async (clubId, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await fetch(`${API_URL}/${clubId}/logo`, { method: 'PUT', headers: getHeaders(false), body: formData });
    const data = translateAnswer(await response.json().catch(() => ({})));
    if (!response.ok) throw new Error(data.errors?.join(' ') || data.message || response.statusText);
    return data;
};

const removeLogo = (clubId) => requestJSON(`${API_URL}/${clubId}/logo`, { method: 'DELETE' });

/**
 * The clubs that take new members (q: part of the name): { nickname, clubs }.
 * nickname: the one the user plays as elsewhere, which joining takes along.
 */
const loadDirectory = (q = '') => requestJSON(`${API_URL}/directory${q ? `?q=${encodeURIComponent(q)}` : ''}`);

/**
 * Joins an open club, or asks to join one whose admins accept members:
 * { nickname, message } → { status: 'member' | 'pending', ... }.
 */
const joinClub = (clubId, { nickname, message }) => requestJSON(`${API_URL}/${clubId}/join`, { method: 'POST', body: { nickname, message } });

const withdrawJoinRequest = (clubId) => requestJSON(`${API_URL}/${clubId}/join`, { method: 'DELETE' });

const loadMyJoinRequests = () => requestJSON(`${API_URL}/join-requests`);

// for the club admins: the open requests, and accepting or declining one
const loadJoinRequests = (clubId) => requestJSON(`${API_URL}/${clubId}/join-requests`);

const decideJoinRequest = (clubId, requestId, accept) =>
    requestJSON(`${API_URL}/${clubId}/join-requests/${requestId}`, { method: 'PUT', body: { accept } });

const ClubService = {
    updateGoals,
    uploadLogo,
    removeLogo,
    addAdmin,
    removeAdmin,
    loadClubs,
    createClub,
    updateClub,
    updateShirt,
    updateGameRules,
    deleteClub,
    findPlayerOfUser,
    addCurrentUserAsPlayer,
    loadDirectory,
    joinClub,
    withdrawJoinRequest,
    loadMyJoinRequests,
    loadJoinRequests,
    decideJoinRequest
};

export default ClubService;
