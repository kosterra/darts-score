import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/games/deletion-requests';

/**
 * Requests to delete a game: a player asks, the other players agree or
 * decline, the club admins decide.
 */
const loadOpen = () => requestJSON(API_URL);
const loadRequest = (id) => requestJSON(`${API_URL}/${id}`);
const ask = (type, game, reason) => requestJSON(API_URL, { method: 'POST', body: { type, game, reason } });
const answer = (id, agree) => requestJSON(`${API_URL}/${id}/answer`, { method: 'PUT', body: { agree } });
const decide = (id, remove, note) => requestJSON(`${API_URL}/${id}/decide`, { method: 'PUT', body: { delete: remove, note } });
const withdraw = (id) => requestJSON(`${API_URL}/${id}`, { method: 'DELETE' });

const DeletionRequestService = { loadOpen, loadRequest, ask, answer, decide, withdraw };

export default DeletionRequestService;
