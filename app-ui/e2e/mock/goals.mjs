// the weekly practice goals for the mock API, with the API's own rules (what each kind
// counts, how it reads, the weeks in a row); how far each is comes from a made-up week
import { goalError, goalView, normalizeGoals, streakOf } from '../../../app-api/src/utils/practice.goals.js';
import { addDays, weekRange } from '../../src/rules/calendar.js';

// how far the user is this week, per kind (a score of Bob's 27, an average, …)
const THIS_WEEK = { trainings: 2, trainingScore: 87, x01Average: 46.3, games: 4, num180s: 1, playDays: 2 };
let goals = [];
let past = [];
let seq = 0;

const current = () => {
    const week = weekRange(new Date());
    return { week, goals: goals.map(goal => goalView(goal, THIS_WEEK[goal.kind] ?? 0)) };
};
const overview = () => {
    const now = current();
    const { streak, recent } = streakOf(past, now);
    return { goals: now.goals, week: { from: now.week.from, until: now.week.until, key: now.week.key }, streak, recent, maxGoals: 3 };
};

/**
 * scenario 'set': three goals, the past weeks mostly reached (the last two in a row);
 * anything else: no goals yet.
 */
export const seedGoals = (scenario) => {
    goals = [];
    past = [];
    THIS_WEEK.trainings = 2;
    if (scenario !== 'set') return;
    goals = normalizeGoals([{ kind: 'trainings', target: 3 }, { kind: 'x01Average', target: 45 }, { kind: 'playDays', target: 3 }], [], () => `goal${++seq}`);
    const monday = weekRange(new Date()).key;
    past = [1, 2, 3, 4, 5, 6].map(back => {
        const reached = back !== 3 && back !== 6;
        const weekGoals = goals.map(goal => ({ ...goalView(goal, reached ? goal.target : Math.max(0, goal.target - 1)), reached }));
        return { week: addDays(monday, -7 * back), goals: weekGoals, allReached: reached };
    });
};

/**
 * What a training just saved adds to the goals, as the API answers it: the
 * goals it counts for ({ practiceGoals }) and those it just reached.
 */
export const goalsAfterTraining = (training) => {
    const before = current().goals;
    THIS_WEEK.trainings += 1;
    const after = current().goals;
    const counts = (goal) => goal.kind === 'playDays' || (goal.kind === 'trainings' && (!goal.training || goal.training === training)) || (goal.kind === 'trainingScore' && goal.training === training);
    return {
        practiceGoals: after.filter(counts),
        goalsReached: after.filter((goal, index) => goal.reached && !before[index].reached).map(({ id, description }) => ({ id, description })),
    };
};

export const goalsMock = (req, res, path, json, send, { url }) => {
    if (path === '/api/goals' && req.method === 'PUT') {
        const list = json.goals ?? [];
        if (!Array.isArray(list) || list.length > 3) return send(res, 422, { errors: ['You can set at most three goals.'] });
        const problem = list.map(goalError).find(Boolean);
        if (problem) return send(res, 422, { errors: [problem] });
        goals = normalizeGoals(list, goals, () => `goal${++seq}`);
        return send(res, 200, overview());
    }
    if (path === '/api/goals') return send(res, 200, overview());
    if (path === '/api/goals/history') return send(res, 200, { weeks: past.slice(0, Number(url.searchParams.get('weeks') ?? 12)) });
    return false;
};
