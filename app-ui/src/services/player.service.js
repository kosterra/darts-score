import { getHeaders, requestJSON } from '../utils/service.utils';

const API_URL = '/api/';

/**
 * Create a new player. Accepts a pre-built FormData object.
 */
const createPlayer = async (formData) => {
    try {
        const response = await fetch(API_URL + 'players', {
            method: 'POST',
            headers: getHeaders(false), // no Content-Type: let browser set multipart boundary
            body: formData
        });
        if (!response.ok) throw new Error(response.statusText);
        return response.ok;
    } catch (error) {
        throw new Error(error.message);
    }
};

const getPlayer = async (playerId) => {
    try {
        const response = await fetch(API_URL + 'players/' + playerId, {
            method: 'GET',
            headers: getHeaders(false)
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Players of the club matching the search term. Guests of single games are
 * left out unless asked for (lists of past games need their names).
 */
const searchPlayers = async (searchTerm, { includeGuests = false } = {}) => {
    try {
        const response = await fetch(API_URL + 'players/search?search=' + encodeURIComponent(searchTerm ?? '') + (includeGuests ? '&includeGuests=true' : ''), {
            method: 'GET',
            headers: getHeaders(false)
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
    } catch (error) {
        throw new Error(error.message);
    }
};

const findPlayersByIds = async (playerIds) => {
    try {
        const response = await fetch(API_URL + 'players/find', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ playerIds })
        });
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Update an existing player.
 * Accepts either { id, formData } (new style from PlayerForm)
 * or a plain object (legacy callers) — auto-converts legacy objects to FormData.
 */
const updatePlayer = async (player) => {
    let formData;
    let id;

    if (player.formData instanceof FormData) {
        // New style: FormData already built by the caller
        formData = player.formData;
        id = player.id;
    } else {
        // Legacy style: plain object → build FormData here
        id = player.id;
        formData = new FormData();
        Object.keys(player).forEach(key => {
            if (player[key] !== undefined) formData.append(key, player[key]);
        });
    }

    try {
        const response = await fetch(API_URL + 'players/' + id, {
            method: 'PUT',
            headers: getHeaders(false),
            body: formData
        });
        if (!response.ok) throw new Error(response.statusText);
        return response.ok;
    } catch (error) {
        throw new Error(error.message);
    }
};

const deletePlayer = async (playerId, clubId) => {
    try {
        const response = await fetch(API_URL + 'players/' + playerId, {
            method: 'DELETE',
            headers: getHeaders(false, clubId)
        });
        if (!response.ok) throw new Error(response.statusText);
        return response.ok;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Links a player to the account with this email (created when needed), so
 * they can log in and play in the club on their own.
 */
const giveLogin = (playerId, account) =>
    requestJSON(`${API_URL}players/${playerId}/account`, { method: 'PUT', body: account });

const removeLogin = (playerId) =>
    requestJSON(`${API_URL}players/${playerId}/account`, { method: 'DELETE' });

/**
 * Adds a guest for a game. The guest does not become a member of the club.
 */
const createGuest = (name) =>
    requestJSON(API_URL + 'players/guest', { method: 'POST', body: { name } });

const makeMember = (playerId) =>
    requestJSON(`${API_URL}players/${playerId}/member`, { method: 'PUT' });

/**
 * Shows or hides a player's nickname on the public start page. The club
 * defaults to the active one.
 */
const setPublicProfile = (playerId, publicProfile, clubId) =>
    requestJSON(`${API_URL}players/${playerId}/visibility`, { method: 'PUT', body: { publicProfile }, clubId });

const PlayerService = {
    setPublicProfile,
    createGuest,
    makeMember,
    giveLogin,
    removeLogin,
    createPlayer,
    getPlayer,
    searchPlayers,
    findPlayersByIds,
    updatePlayer,
    deletePlayer
};

export default PlayerService;
