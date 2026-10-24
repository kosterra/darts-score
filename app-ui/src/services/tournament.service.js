import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/tournaments';

// the club's tournaments: { min, eligible, canCreate, tournaments }; active: only those the dashboard shows
const loadTournaments = ({ active = false } = {}) => requestJSON(`${API_URL}${active ? '?active=1' : ''}`);
const loadTournament = (id) => requestJSON(`${API_URL}/${id}`);
// { name, description, maxPlayers, closesAt, preset, rounds: [{ size, date, rules }], open? }
const createTournament = (setup) => requestJSON(API_URL, { method: 'POST', body: setup });
const updateTournament = (id, setup) => requestJSON(`${API_URL}/${id}`, { method: 'PUT', body: setup });
const deleteTournament = (id) => requestJSON(`${API_URL}/${id}`, { method: 'DELETE' });
const openRegistration = (id) => requestJSON(`${API_URL}/${id}/open`, { method: 'POST' });
const closeRegistration = (id) => requestJSON(`${API_URL}/${id}/close`, { method: 'POST' });
const reopenRegistration = (id, closesAt) => requestJSON(`${API_URL}/${id}/reopen`, { method: 'POST', body: { closesAt } });
const cancelTournament = (id) => requestJSON(`${API_URL}/${id}/cancel`, { method: 'POST' });
// the member asking: 'in' or 'out'
const answer = (id, status) => requestJSON(`${API_URL}/${id}/entry`, { method: 'PUT', body: { status } });
// an admin for a member
const answerFor = (id, playerId, status) => requestJSON(`${API_URL}/${id}/entries/${playerId}`, { method: 'PUT', body: { status } });
const holdDraw = (id, seeding) => requestJSON(`${API_URL}/${id}/draw`, { method: 'POST', body: { seeding } });
// → { game }: the X01 game of the match
const startMatch = (id, match, first) => requestJSON(`${API_URL}/${id}/matches/${match}/start`, { method: 'POST', body: { first } });
const setResult = (id, match, winner) => requestJSON(`${API_URL}/${id}/matches/${match}/result`, { method: 'PUT', body: { winner } });

// the links of the invitations, without logging in
const loadReply = (token) => requestJSON(`/api/tournament-reply?token=${encodeURIComponent(token)}`);
const sendReply = (token, answer) => requestJSON('/api/tournament-reply', { method: 'POST', body: { token, answer } });

const TournamentService = {
    loadTournaments, loadTournament, createTournament, updateTournament, deleteTournament,
    openRegistration, closeRegistration, reopenRegistration, cancelTournament,
    answer, answerFor, holdDraw, startMatch, setResult, loadReply, sendReply,
};

export default TournamentService;
