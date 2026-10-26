import { requestJSON } from '../utils/service.utils';

// the big screen of a running game: a link from the game (a member of the club), and the game it shows, without a login
const createScreenLink = (kind, id) => requestJSON(`/api/games/${kind}/${id}/screen`, { method: 'POST' });
const loadScreen = (token) => requestJSON(`/api/screen/${encodeURIComponent(token)}`);

const ScreenService = { createScreenLink, loadScreen };
export default ScreenService;
