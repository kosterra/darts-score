import { translateAnswer } from '../utils/i18n';
import {
    answerError,
    getHeaders
} from '../utils/service.utils';
import { gameOf, storedOf } from '../rules/stored';

const API_URL = '/api/';

// Public methods to export
const createEliminationGame = async (game) => {
    try {
        const response = await fetch(API_URL + 'games/elimination', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(game)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error.message);
    }
}

const loadRunningEliminationGames = async () => {
    let data = await loadAllEliminationGames();
    return data.filter(game => game.gameIsRunning).sort((a,b)=>{
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

const loadFinishedEliminationGames = async () => {
    let data = await loadAllEliminationGames();
    return data.filter(game => !game.gameIsRunning).sort((a,b)=>{
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

const loadAllEliminationGames = async () => {
    try {
        const response = await fetch(API_URL + 'games/elimination', {
            method: 'GET',
            headers: getHeaders(false)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };
        
        let data = translateAnswer(await response.json());
        return data.sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    } catch (error) {
        throw new Error(error.message);
    }
}

const findEliminationGames = async (body) => {
    try {
        const response = await fetch(API_URL + 'games/elimination/find', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        let data = translateAnswer(await response.json());
        return data.sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    } catch (error) {
        throw Error(error.message);
    }
}

// rejects with the API's message and the status (404: the game is gone)
const loadEliminationGameById = async (id) => {
    const response = await fetch(API_URL + 'games/elimination/' + id, {
        method: 'GET',
        headers: getHeaders(false)
    });
    if (!response.ok) throw await answerError(response);
    return translateAnswer(await response.json());
}

// basedOn: the "updatedAt" of the stored state this one builds on; → the game as stored now.
// Rejects with the status: 409 when the server has a newer state or the game is finished
const updateEliminationGame = async (game, { basedOn } = {}) => {
    const response = await fetch(API_URL + 'games/elimination/' + game.id, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(basedOn ? { ...game, basedOn } : game)
    });
    if (!response.ok) throw await answerError(response);
    return translateAnswer(await response.json());
}

const deleteEliminationGame = async (gameId, clubId) => {
    try {
        const response = await fetch(API_URL + 'games/elimination/' + gameId, {
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
const EliminationService = {
    // stored as its settings, players and visits; the game comes back worked out from them
    createEliminationGame: async (game) => gameOf('elimination', await createEliminationGame(storedOf('elimination', { ...game, visits: game.visits ?? [] }))),
    loadRunningEliminationGames,
    loadFinishedEliminationGames,
    loadAllEliminationGames,
    findEliminationGames,
    loadEliminationGameById: async (id) => gameOf('elimination', await loadEliminationGameById(id)),
    updateEliminationGame: (game, options) => updateEliminationGame(storedOf('elimination', game), options),
    deleteEliminationGame
}

export default EliminationService;