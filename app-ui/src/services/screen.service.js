import { requestJSON } from '../utils/service.utils';

// the big screen of a running game: a link from the game (a member of the club), and the game it shows, without a login
const createScreenLink = (kind, id) => requestJSON(`/api/games/${kind}/${id}/screen`, { method: 'POST' });
const loadScreen = (token) => requestJSON(`/api/screen/${encodeURIComponent(token)}`);

// a TV paired by its code: it pairs itself and asks what to show; a member sends a game to its code
const pairTv = () => requestJSON('/api/screen/pairings', { method: 'POST' });
const loadPairing = (secret) => requestJSON(`/api/screen/pairings/${encodeURIComponent(secret)}`);
const sendToTv = (kind, id, code) => requestJSON(`/api/games/${kind}/${id}/screen/send`, { method: 'POST', body: { code } });

const ScreenService = { createScreenLink, loadScreen, pairTv, loadPairing, sendToTv };
export default ScreenService;
