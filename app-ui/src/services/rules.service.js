import { translateAnswer } from '../utils/i18n';
import { answerError, getHeaders } from '../utils/service.utils';

// the games and trainings of the rules engine (Shanghai, Killer, … and Bob's 27, 121 Checkout, …)
const GAMES_URL = '/api/games/rules';
const TRAININGS_URL = '/api/training/rules';

const request = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) throw await answerError(response);
    return translateAnswer(await response.json());
};

const createGame = (game) => request(GAMES_URL, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(game) });

const loadGame = (id) => request(`${GAMES_URL}/${id}`, { method: 'GET', headers: getHeaders(false) });

// basedOn: the "updatedAt" of the stored state this one builds on (a 409 when the server has a newer one)
const updateGame = (game, { basedOn } = {}) => request(`${GAMES_URL}/${game.id}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ ...game, ...(basedOn && { basedOn }) }) });

// newest first
// filter: the query string of the filter by level (see utils/play.levels.js)
const loadAllGames = async (filter = '') => (await request(`${GAMES_URL}${filter}`, { method: 'GET', headers: getHeaders(false) }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

const deleteGame = async (id, clubId) => {
    const response = await fetch(`${GAMES_URL}/${id}`, { method: 'DELETE', headers: getHeaders(false, clubId) });
    return response.ok;
};

// once it is over: the answer says whether it is a new best (isRecord) and which badges it earned
const createTraining = (training) => request(TRAININGS_URL, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(training) });

// of one kind, or all of them
// level: only those played at that level (see utils/play.levels.js)
const loadTrainings = (kind, level = null) => {
    const params = new URLSearchParams({ ...(kind && { kind }), ...(level && level !== 'all' && { level }) }).toString();
    return request(`${TRAININGS_URL}${params ? `?${params}` : ''}`, { method: 'GET', headers: getHeaders(false) });
};

const deleteTraining = async (id, clubId) => {
    const response = await fetch(`${TRAININGS_URL}/${id}`, { method: 'DELETE', headers: getHeaders(false, clubId) });
    return response.ok;
};

const RulesService = { createGame, loadGame, updateGame, loadAllGames, deleteGame, createTraining, loadTrainings, deleteTraining };

export default RulesService;
