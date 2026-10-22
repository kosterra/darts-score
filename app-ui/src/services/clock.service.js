import { translateAnswer } from '../utils/i18n';
import { getHeaders } from '../utils/service.utils';
import { gameOf, storedOf } from '../rules/stored';

const API_URL = '/api/games/clock';

const request = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(response.statusText);
    return translateAnswer(await response.json());
};

// stored as its settings, players and visits; the game comes back worked out from them
const createClockGame = async (game) => gameOf('clock', await request(API_URL, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(storedOf('clock', { ...game, visits: game.visits ?? [] })) }));

const loadClockGameById = async (id) => gameOf('clock', await request(`${API_URL}/${id}`, { method: 'GET', headers: getHeaders(false) }));

const updateClockGame = (game) => request(`${API_URL}/${game.id}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify(storedOf('clock', game)) });

// newest first
const loadAllClockGames = async () => (await request(API_URL, { method: 'GET', headers: getHeaders(false) }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

const deleteClockGame = async (id, clubId) => {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: getHeaders(false, clubId) });
    return response.ok;
};

const ClockService = { createClockGame, loadClockGameById, updateClockGame, loadAllClockGames, deleteClockGame };

export default ClockService;
