import { translateAnswer } from '../utils/i18n';
import { getHeaders } from '../utils/service.utils';

// the games and trainings of the rules engine (Shanghai, Killer, … and Bob's 27, 121 Checkout, …)
const GAMES_URL = '/api/games/rules';
const TRAININGS_URL = '/api/training/rules';

const request = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(response.statusText);
    return translateAnswer(await response.json());
};

const createGame = (game) => request(GAMES_URL, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(game) });

const loadGame = (id) => request(`${GAMES_URL}/${id}`, { method: 'GET', headers: getHeaders(false) });

const updateGame = (game) => request(`${GAMES_URL}/${game.id}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify(game) });

// newest first
const loadAllGames = async () => (await request(GAMES_URL, { method: 'GET', headers: getHeaders(false) }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

const deleteGame = async (id, clubId) => {
    const response = await fetch(`${GAMES_URL}/${id}`, { method: 'DELETE', headers: getHeaders(false, clubId) });
    return response.ok;
};

// once it is over: the answer says whether it is a new best (isRecord) and which badges it earned
const createTraining = (training) => request(TRAININGS_URL, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(training) });

// of one kind, or all of them
const loadTrainings = (kind) => request(`${TRAININGS_URL}${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`, { method: 'GET', headers: getHeaders(false) });

const deleteTraining = async (id, clubId) => {
    const response = await fetch(`${TRAININGS_URL}/${id}`, { method: 'DELETE', headers: getHeaders(false, clubId) });
    return response.ok;
};

const RulesService = { createGame, loadGame, updateGame, loadAllGames, deleteGame, createTraining, loadTrainings, deleteTraining };

export default RulesService;
