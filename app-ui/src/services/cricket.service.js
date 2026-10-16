import {
    getHeaders
} from '../utils/service.utils';

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

        return await response.json();
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

const loadAllCricketGames = async () => {
    try {
        const response = await fetch(API_URL + 'games/cricket', {
            method: 'GET',
            headers: getHeaders(false)
        });
            
        if (!response.ok) {
            throw Error(response.statusText);
        };

        return await response.json();
    } catch (error) {
        throw new Error(error);
    }
}

const loadCricketGameById = async (id) => {
    try {
        const response = await fetch(API_URL + 'games/cricket/' + id, {
            method: 'GET',
            headers: getHeaders(false)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return await response.json();
    } catch (error) {
        throw new Error(error);
    }
}

const updateCricketGame = async (game) => {
    try {
        const response = await fetch(API_URL + 'games/cricket/' + game.id, {
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
    createCricketGame,
    loadRunningCricketGames,
    loadFinishedCricketGames,
    loadAllCricketGames,
    loadCricketGameById,
    updateCricketGame,
    deleteCricketGame
}

export default CricketService;