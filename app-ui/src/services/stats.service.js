import {
    getHeaders
} from '../utils/service.utils';

const API_URL = '/api/';

// Public methods to export
const loadPlayerStats = async (playerId) => {
    try {
        const response = await fetch(API_URL + 'stats/player/' + playerId, {
            method: 'GET',
            headers: getHeaders(false)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return await response.json();
    } catch (error) {
        throw Error(error.message);
    }
}

const loadX01PlayersStats = async (body) => {
    try {
        const response = await fetch(API_URL + 'stats/players/x01', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return await response.json();
    } catch (error) {
        throw Error(error.message);
    }
}


const loadX01GameStats = async (gameId) => {
    try {
        const response = await fetch(API_URL + 'stats/games/x01/' + gameId, {
            method: 'GET',
            headers: getHeaders(false)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return await response.json();
    } catch (error) {
        throw Error(error.message);
    }
}

// Export methods
const StatsService = {
    loadPlayerStats,
    loadX01GameStats,
    loadX01PlayersStats
}

export default StatsService;