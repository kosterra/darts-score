import { translateAnswer } from '../utils/i18n';
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

        return translateAnswer(await response.json());
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

        return translateAnswer(await response.json());
    } catch (error) {
        throw Error(error.message);
    }
}

// Export methods
/**
 * Club dashboard data: facts about the club, leaderboards and recent games.
 */
// "Your year in darts" of a player: the look back at a year (this one when left out), with the years there are
const loadYear = (playerId, year) => requestJSON(`${API_URL}stats/player/${playerId}/year${year ? `?year=${year}` : ''}`);
const loadClubStats = () => requestJSON(API_URL + 'stats/club');
// the games the user plays most lately: [{ id, type, kind, settings, players, opponents, count, lastAt }]
const loadFavourites = () => requestJSON(API_URL + 'stats/favourites');

// the first steps of a new user in the club: { role, items: [{ id, done }] }
const loadFirstSteps = () => requestJSON(API_URL + 'stats/first-steps');
// starts one again → { type, kind, id, path }
const startFavourite = (id) => requestJSON(`${API_URL}stats/favourites/${id}/start`, { method: 'POST' });

/**
 * Badge overview of the club: every player with their number of badges.
 */
const loadClubBadges = () => requestJSON(API_URL + 'stats/badges');

// the badges the club earned together, the progress to the others, and its goals
const loadClubOwnBadges = (clubId) => requestJSON(API_URL + 'stats/club-badges', { clubId });

/**
 * The Hall of Shame of the club: who holds each shame badge right now,
 * { enabled, badges: [{ id, title, description, wash, holder, since, sourceType, sourceId }] }.
 */
/**
 * The games of the club at a glance, over all of them: { total, last30Days,
 * running, players, popular, ranking, winRates, playersById }.
 */
const loadGamesOverview = () => requestJSON(API_URL + 'stats/games');

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

// the player comparison: the duel in one game type, each player side by side, and who a player meets most
const loadDuel = (body) => requestJSON(`${API_URL}stats/compare/duel`, { method: 'POST', body });
const loadSideBySide = (body) => requestJSON(`${API_URL}stats/compare/side`, { method: 'POST', body });
const loadOpponents = (playerId) => requestJSON(`${API_URL}stats/compare/opponents/${playerId}`);
// a player's head to head with the others: played most and least, the best record and the toughest
const loadRivals = (playerId) => requestJSON(`${API_URL}stats/compare/rivals/${playerId}`);

const loadPlayerGames = (playerId, limit = 5) => requestJSON(`${API_URL}stats/player/${playerId}/games?limit=${limit}`);

/**
 * The badges each player earned in one game ('x01' | 'cricket' | 'elimination').
 */
const loadGameBadges = (gameType, gameId) => requestJSON(`${API_URL}stats/badges/game/${gameType}/${gameId}`);

const StatsService = {
    loadYear,
    loadClubBadges,
    loadClubOwnBadges,
    loadClubShame,
    loadGamesOverview,
    loadPlayerBadges,
    loadGameBadges,
    loadClubStats,
    loadFavourites,
    loadFirstSteps,
    startFavourite,
    loadPlayerStats,
    loadPlayerGames,
    loadDuel,
    loadSideBySide,
    loadOpponents,
    loadRivals,
    loadPlayerLevels,
    loadPlayersForm,
    loadX01GameStats
}

export default StatsService;