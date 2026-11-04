import { requestJSON } from '../utils/service.utils';

// Boards: games side by side on the boards of a club, called from a queue (a tournament, a club night)

// a tournament (host club admins): { count, out: [numbers] }; a match moved to a board, or held back → the tournament
const setTournamentBoards = (id, boards) => requestJSON(`/api/tournaments/${id}/boards`, { method: 'PUT', body: boards });
const moveMatch = (id, match, board) => requestJSON(`/api/tournaments/${id}/matches/${match}/board`, { method: 'PUT', body: { board } });
const holdMatch = (id, match, held) => requestJSON(`/api/tournaments/${id}/matches/${match}/held`, { method: 'PUT', body: { held } });
// the big screen of its boards: { token, expiresAt }, or sent to the TV showing a code
const tournamentScreen = (id) => requestJSON(`/api/tournaments/${id}/boards/screen`, { method: 'POST' });
const sendTournamentScreen = (id, code) => requestJSON(`/api/tournaments/${id}/boards/screen/send`, { method: 'POST', body: { code } });

// a club night on boards: the night, or null while it is not played on boards
const NIGHT = (day) => `/api/calendar/nights/${day}/boards`;
const loadNight = (day) => requestJSON(NIGHT(day));
// (club admins) any of { count, out, players: [ids], setup } → the night
const saveNight = (day, changes) => requestJSON(NIGHT(day), { method: 'PUT', body: changes });
// (club admins) exactly one of { board } | { held } | { status: 'cancelled' } → the night
const changeEntry = (day, entry, change) => requestJSON(`${NIGHT(day)}/entries/${entry}`, { method: 'PUT', body: change });
// a player of the entry or an admin → { game: { kind, id } }
const startEntry = (day, entry, first = null) => requestJSON(`${NIGHT(day)}/entries/${entry}/start`, { method: 'POST', body: first ? { first } : {} });
const nightScreen = (day) => requestJSON(`${NIGHT(day)}/screen`, { method: 'POST' });
const sendNightScreen = (day, code) => requestJSON(`${NIGHT(day)}/screen/send`, { method: 'POST', body: { code } });

// the club's number of boards, the default for tournaments and club nights (club admins) → { boards }
const saveClubBoards = (count) => requestJSON('/api/calendar/boards', { method: 'PUT', body: { count } });

// the user's matches called to a board or played on one now, across their clubs
const loadMine = () => requestJSON('/api/boards/mine');

const BoardService = {
    setTournamentBoards, moveMatch, holdMatch, tournamentScreen, sendTournamentScreen,
    loadNight, saveNight, changeEntry, startEntry, nightScreen, sendNightScreen,
    saveClubBoards, loadMine,
};

export default BoardService;
