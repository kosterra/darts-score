import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/leagues';

// the club's leagues: { leagues }
const loadLeagues = () => requestJSON(API_URL);
const loadLeague = (id) => requestJSON(`${API_URL}/${id}`);
// { name, description, players, meetings, everyDays, firstDay, rules, start? }
const createLeague = (setup) => requestJSON(API_URL, { method: 'POST', body: setup });
const updateLeague = (id, setup) => requestJSON(`${API_URL}/${id}`, { method: 'PUT', body: setup });
const deleteLeague = (id) => requestJSON(`${API_URL}/${id}`, { method: 'DELETE' });
const startLeague = (id) => requestJSON(`${API_URL}/${id}/start`, { method: 'POST' });
const cancelLeague = (id) => requestJSON(`${API_URL}/${id}/cancel`, { method: 'POST' });
// a match as an X01 game, the given player throwing first: { game }
const startMatch = (id, match, first) => requestJSON(`${API_URL}/${id}/matches/${match}/start`, { method: 'POST', body: { first } });
const setResult = (id, match, winner) => requestJSON(`${API_URL}/${id}/matches/${match}/result`, { method: 'PUT', body: { winner } });
// a match to another day (null: back to its matchday's)
const moveMatch = (id, match, date) => requestJSON(`${API_URL}/${id}/matches/${match}/date`, { method: 'PUT', body: { date } });
const moveMatchday = (id, day, date) => requestJSON(`${API_URL}/${id}/matchdays/${day}/date`, { method: 'PUT', body: { date } });

const LeagueService = { loadLeagues, loadLeague, createLeague, updateLeague, deleteLeague, startLeague, cancelLeague, startMatch, setResult, moveMatch, moveMatchday };

export default LeagueService;
