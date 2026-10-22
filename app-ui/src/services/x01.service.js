import { translateAnswer } from '../utils/i18n';
import {
    getHeaders
} from '../utils/service.utils';
import { gameOf, storedOf } from '../rules/stored';

const API_URL = '/api/';

// Public methods to export
const createX01Game = async (game) => {
    try {
        const response = await fetch(API_URL + 'games/x01', {
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

const loadRunningX01Games = async () => {
    let data = await loadAllX01Games();
    return data.filter(game => game.gameIsRunning).sort((a,b)=>{
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

const loadFinishedX01Games = async () => {
    let data = await loadAllX01Games();
    return data.filter(game => !game.gameIsRunning).sort((a,b)=>{
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

const loadAllX01Games = async () => {
    try {
        const response = await fetch(API_URL + 'games/x01', {
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

const findX01Games = async (body) => {
    try {
        const response = await fetch(API_URL + 'games/x01/find', {
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

const loadX01GameById = async (id) => {
    try {
        const response = await fetch(API_URL + 'games/x01/' + id, {
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

const updateX01Game = async (game) => {
    try {
        const response = await fetch(API_URL + 'games/x01/' + game.id, {
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

const deleteX01Game = async (x01Id, clubId) => {
    try {
        const response = await fetch(API_URL + 'games/x01/' + x01Id, {
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
const X01Service = {
    // stored as its settings, players and visits; the game comes back worked out from them
    createX01Game: async (game) => gameOf('x01', await createX01Game(storedOf('x01', { ...game, visits: game.visits ?? [] }))),
    loadRunningX01Games,
    loadFinishedX01Games,
    loadAllX01Games,
    findX01Games,
    loadX01GameById: async (id) => gameOf('x01', await loadX01GameById(id)),
    updateX01Game: (game) => updateX01Game(storedOf('x01', game)),
    deleteX01Game
}

export default X01Service;