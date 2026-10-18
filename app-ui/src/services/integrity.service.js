import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/integrity';

/**
 * The games and trainings that break a rule of fair play: of the selected club,
 * or with "all" (global admins) of every club. { entries, thresholds }
 */
const loadFindings = (all = false) => requestJSON(`${API_URL}${all ? '?scope=all' : ''}`);

// what is waiting, for the count in the menu: { impossible, suspicious, open }
const loadSummary = (all = false) => requestJSON(`${API_URL}/summary${all ? '?scope=all' : ''}`);

// the count in the menu follows reviews and deletions on the page
export const FAIR_PLAY_CHANGED = 'darts-score:fair-play-changed';
export const announceFairPlayChange = () => window.dispatchEvent(new Event(FAIR_PLAY_CHANGED));

// 'ok' looked at and fine, 'watch' kept on the watch list
const review = (type, id, status) => requestJSON(`${API_URL}/${type}/${id}/review`, { method: 'PUT', body: { status } });

// deletes it, and the badges earned in it
const remove = (type, id) => requestJSON(`${API_URL}/${type}/${id}`, { method: 'DELETE' });

// deletes several at once: [{ type, id }] → { deleted, skipped }
const removeMany = (items) => requestJSON(`${API_URL}/delete`, { method: 'POST', body: { items } });

const IntegrityService = { loadFindings, loadSummary, review, remove, removeMany };

export default IntegrityService;
