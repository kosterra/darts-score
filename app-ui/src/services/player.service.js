import { getHeaders } from '../utils/service.utils';

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

const searchPlayers = async (searchTerm) => {
    try {
        const response = await fetch(API_URL + 'players/search?search=' + (searchTerm ?? ''), {
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

const deletePlayer = async (playerId) => {
    try {
        const response = await fetch(API_URL + 'players/' + playerId, {
            method: 'DELETE',
            headers: getHeaders(false)
        });
        if (!response.ok) throw new Error(response.statusText);
        return response.ok;
    } catch (error) {
        throw new Error(error.message);
    }
};

const PlayerService = {
    createPlayer,
    getPlayer,
    searchPlayers,
    findPlayersByIds,
    updatePlayer,
    deletePlayer
};

export default PlayerService;
