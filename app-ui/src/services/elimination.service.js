import { translateAnswer } from '../utils/i18n';
import {
    getHeaders
} from '../utils/service.utils';

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

const loadEliminationGameById = async (id) => {
    try {
        const response = await fetch(API_URL + 'games/elimination/' + id, {
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

const updateEliminationGame = async (game) => {
    try {
        const response = await fetch(API_URL + 'games/elimination/' + game.id, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(game)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return response.ok;
    } catch (error) {
        throw new Error(error);
    }
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
    createEliminationGame,
    loadRunningEliminationGames,
    loadFinishedEliminationGames,
    loadAllEliminationGames,
    findEliminationGames,
    loadEliminationGameById,
    updateEliminationGame,
    deleteEliminationGame
}

export default EliminationService;