import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/admin';

/**
 * Everything a global admin looks after: totals, all clubs and the state of the installation.
 */
const loadOverview = () => requestJSON(`${API_URL}/overview`);

// every club, for the club filter of the admin lists
const loadClubs = () => requestJSON(`${API_URL}/clubs`);

// players, games and trainings of the given clubs, each with its club
const query = (clubIds) => `?clubs=${clubIds.map(encodeURIComponent).join(',')}`;
const loadPlayers = (clubIds) => requestJSON(`${API_URL}/players${query(clubIds)}`);
const loadGames = (clubIds) => requestJSON(`${API_URL}/games${query(clubIds)}`);
const loadTrainings = (clubIds) => requestJSON(`${API_URL}/trainings${query(clubIds)}`);

const AdminService = {
    loadOverview,
    loadClubs,
    loadPlayers,
    loadGames,
    loadTrainings
};

export default AdminService;
