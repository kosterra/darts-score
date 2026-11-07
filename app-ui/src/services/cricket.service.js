import { translateAnswer } from '../utils/i18n';
import {
    answerError,
    getHeaders
} from '../utils/service.utils';
import { gameOf, storedOf } from '../rules/stored';

const API_URL = '/api/';

// Public methods to export
const createCricketGame = async (game) => {
    try {
        const response = await fetch(API_URL + 'games/cricket', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(game)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error);
    }
}

const loadRunningCricketGames = async () => {
    let data = await loadAllCricketGames();
    return data.filter(game => game.gameIsRunning).sort((a,b)=>{
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

const loadFinishedCricketGames = async () => {
    let data = await loadAllCricketGames();
    return data.filter(game => !game.gameIsRunning).sort((a,b)=>{
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

// filter: the query string of the filter by level (see utils/play.levels.js), '' for none
const loadAllCricketGames = async (filter = '') => {
    try {
        const response = await fetch(API_URL + 'games/cricket' + filter, {
            method: 'GET',
            headers: getHeaders(false)
        });
            
        if (!response.ok) {
            throw Error(response.statusText);
        };

        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error);
    }
}

// rejects with the API's message and the status (404: the game is gone)
const loadCricketGameById = async (id) => {
    const response = await fetch(API_URL + 'games/cricket/' + id, {
        method: 'GET',
        headers: getHeaders(false)
    });
    if (!response.ok) throw await answerError(response);
    return translateAnswer(await response.json());
}

// basedOn: the "updatedAt" of the stored state this one builds on; → the game as stored now.
// Rejects with the status: 409 when the server has a newer state or the game is finished
const updateCricketGame = async (game, { basedOn } = {}) => {
    const response = await fetch(API_URL + 'games/cricket/' + game.id, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(basedOn ? { ...game, basedOn } : game)
    });
    if (!response.ok) throw await answerError(response);
    return translateAnswer(await response.json());
}

const deleteCricketGame = async (cricketId, clubId) => {
    try {
        const response = await fetch(API_URL + 'games/cricket/' + cricketId, {
            method: 'DELETE',
            headers: getHeaders(false, clubId)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return response.ok;
    } catch (error) {
        throw Error(error.message);
    }
}

// Export methods
const CricketService = {
    // stored as its settings, players and visits; the game comes back worked out from them
    createCricketGame: async (game) => gameOf('cricket', await createCricketGame(storedOf('cricket', { ...game, visits: game.visits ?? [] }))),
    loadRunningCricketGames,
    loadFinishedCricketGames,
    loadAllCricketGames,
    loadCricketGameById: async (id) => gameOf('cricket', await loadCricketGameById(id)),
    updateCricketGame: (game, options) => updateCricketGame(storedOf('cricket', game), options),
    deleteCricketGame
}

export default CricketService;