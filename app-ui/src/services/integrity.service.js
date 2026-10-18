import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/integrity';

/**
 * The games and trainings that break a rule of fair play: of the selected club,
 * or with "all" (global admins) of every club. { entries, thresholds }
 */
const loadFindings = (all = false) => requestJSON(`${API_URL}${all ? '?scope=all' : ''}`);

// 'ok' looked at and fine, 'watch' kept on the watch list
const review = (type, id, status) => requestJSON(`${API_URL}/${type}/${id}/review`, { method: 'PUT', body: { status } });

// deletes it, and the badges earned in it
const remove = (type, id) => requestJSON(`${API_URL}/${type}/${id}`, { method: 'DELETE' });

const IntegrityService = { loadFindings, review, remove };

export default IntegrityService;
