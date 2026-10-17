import {
    getHeaders,
    requestJSON
} from '../utils/service.utils';

const API_URL = '/api/';

// Public methods to export
// filters: { scope, period, from, to, lastGames, startingScore, setMode, numberOfSets, legMode, numberOfLegs }
const loadPlayerStats = async (playerId, filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value != null && value !== '')).toString();
    try {
        const response = await fetch(API_URL + 'stats/player/' + playerId + (query ? `?${query}` : ''), {
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
/**
 * Club dashboard data: facts about the club, leaderboards and recent games.
 */
const loadClubStats = () => requestJSON(API_URL + 'stats/club');

/**
 * Badge overview of the club: every player with their number of badges.
 */
const loadClubBadges = () => requestJSON(API_URL + 'stats/badges');

/**
 * All badges for one player, earned ones and the progress towards the others.
 */
const loadPlayerBadges = (playerId) => requestJSON(API_URL + 'stats/badges/player/' + playerId);

/**
 * A player's latest games in the selected club: { total, games, players }.
 */
/**
 * The level of every club member: { [playerId]: { id, name, index, xp } }.
 */
const loadPlayerLevels = () => requestJSON(`${API_URL}stats/levels`);

/**
 * Head to head in Cricket or Elimination with the comparison filters
 * ({ type, playerIds, includeOthers, dateFilter, from, to, lastGames }).
 */
const loadHeadToHead = (body) => requestJSON(`${API_URL}stats/players/headtohead`, { method: 'POST', body });

const loadPlayerGames = (playerId, limit = 5) => requestJSON(`${API_URL}stats/player/${playerId}/games?limit=${limit}`);

/**
 * The badges each player earned in one game ('x01' | 'cricket' | 'elimination').
 */
const loadGameBadges = (gameType, gameId) => requestJSON(`${API_URL}stats/badges/game/${gameType}/${gameId}`);

const StatsService = {
    loadClubBadges,
    loadPlayerBadges,
    loadGameBadges,
    loadClubStats,
    loadPlayerStats,
    loadPlayerGames,
    loadHeadToHead,
    loadPlayerLevels,
    loadX01GameStats,
    loadX01PlayersStats
}

export default StatsService;