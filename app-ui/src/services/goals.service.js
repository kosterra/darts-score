import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/goals';

// the user's weekly goals with how far each is: { goals, week, streak, recent, maxGoals }
const loadGoals = () => requestJSON(API_URL);
// the whole list (the server keeps a goal by its id); answers as loadGoals
const saveGoals = (goals) => requestJSON(API_URL, { method: 'PUT', body: { goals } });
// the weeks that ended, newest first: { weeks: [{ week, goals, allReached }] }
const loadHistory = (weeks = 12) => requestJSON(`${API_URL}/history?weeks=${weeks}`);

const GoalsService = { loadGoals, saveGoals, loadHistory };

export default GoalsService;
