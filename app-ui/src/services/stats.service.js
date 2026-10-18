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
 * The Hall of Shame of the club: who holds each shame badge right now,
 * { enabled, badges: [{ id, title, description, wash, holder, since, sourceType, sourceId }] }.
 */
const loadClubShame = () => requestJSON(API_URL + 'stats/shame');

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

// the current X01 form of compared players: { [playerId]: { trend, change, recentAverage, previousAverage, latest } }
const loadPlayersForm = (playerIds) => requestJSON(`${API_URL}stats/players/form`, { method: 'POST', body: { playerIds } });

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
    loadClubShame,
    loadPlayerBadges,
    loadGameBadges,
    loadClubStats,
    loadPlayerStats,
    loadPlayerGames,
    loadHeadToHead,
    loadPlayerLevels,
    loadPlayersForm,
    loadX01GameStats,
    loadX01PlayersStats
}

export default StatsService;