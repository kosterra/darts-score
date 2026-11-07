import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { partsIn, timeIn } from '../../src/rules/zones.js';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * The weekly practice goals through the real app and database: each user
 * sees and sets only their own, the list is checked, a training counts for
 * them (and tells the goal reached once), and the week that ended shows
 * under the past weeks.
 */

let mongod;
let db;
let app;
const state = {};
const api = () => supertest(app);
const DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    const { hashPassword } = await import('../../src/utils/auth.utils.js');

    const passwordHash = await hashPassword('Passw0rd!');
    const [ann, ben] = await Promise.all([
        db.user.create({ email: 'ann@test.local', firstname: 'Ann', lastname: 'Tester', passwordHash }),
        db.user.create({ email: 'ben@test.local', firstname: 'Ben', lastname: 'Tester', passwordHash }),
        db.user.create({ email: 'root@test.local', firstname: 'Root', lastname: 'Admin', passwordHash, role: 'globalAdmin' }),
    ]);
    // Ben runs the club; Ann plays in it
    const club = await db.club.create({ name: 'Goal Darts Club', admins: [ben._id] });
    const annPlayer = await db.player.create({ nickname: 'Annie', firstname: 'Ann', lastname: 'Tester', clubs: [club._id], dateOfBirth: new Date('1990-05-15'), user: ann._id });

    const login = async (email) => {
        const res = await api().post('/api/auth/login').send({ email, password: 'Passw0rd!' });
        if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
        return res.headers['set-cookie'];
    };
    Object.assign(state, {
        ann: await login('ann@test.local'), ben: await login('ben@test.local'), root: await login('root@test.local'),
        annId: ann._id, club: String(club._id), annPlayer: String(annPlayer._id),
    });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const as = (cookie, clubId) => {
    const attach = (req) => { req.set('Cookie', cookie); if (clubId) req.set('X-Club-Id', clubId); return req; };
    return {
        get: (path) => attach(api().get(path)),
        post: (path, body) => attach(api().post(path)).send(body ?? {}),
        put: (path, body) => attach(api().put(path)).send(body ?? {}),
    };
};
const training = (cookie) => as(cookie, state.club).post('/api/training/atc', { scoring: 'Time', timeMs: 95000, mode: 'Single', player: { id: state.annPlayer } });

describe('setting the goals', () => {
    it('starts without any, for the week from Monday', async () => {
        const res = await as(state.ann).get('/api/goals');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ goals: [], streak: 0, maxGoals: 3 });
        // Monday at midnight in Zurich (Sunday evening in UTC), whatever the server's time zone
        expect(partsIn(res.body.week.from).weekday).toBe(1);
        expect(timeIn(res.body.week.from)).toBe('00:00');
        expect(res.body.recent).toHaveLength(8);
    });

    it('saves the whole list and gives each goal an id', async () => {
        const res = await as(state.ann).put('/api/goals', { goals: [{ kind: 'trainings', target: 2 }, { kind: 'trainingScore', target: 100, training: 'bobs27' }] });
        expect(res.status).toBe(200);
        expect(res.body.goals.map(goal => [goal.description, goal.progress])).toEqual([['2 trainings', 0], ['100 or better in Bob\'s 27', null]]);
        expect(res.body.goals.every(goal => goal.id)).toBe(true);
        state.goals = res.body.goals;
    });

    it('are the user\'s own: the club admin does not see them', async () => {
        const res = await as(state.ben).get('/api/goals');
        expect(res.body.goals).toEqual([]);
        expect((await db.user.findById(state.annId, 'practiceGoals').lean()).practiceGoals).toHaveLength(2);
    });

    it('refuses a fourth goal, an unknown kind, a missing training and a number out of range', async () => {
        const four = await as(state.ann).put('/api/goals', { goals: Array.from({ length: 4 }, () => ({ kind: 'games', target: 1 })) });
        expect(four.status).toBe(422);
        expect((await as(state.ann).put('/api/goals', { goals: [{ kind: 'darts', target: 100 }] })).status).toBe(422);
        const noTraining = await as(state.ann).put('/api/goals', { goals: [{ kind: 'trainingScore', target: 100 }] });
        expect(noTraining.status).toBe(422);
        expect(noTraining.body.errors).toEqual(['Choose the training of the goal.']);
        expect((await as(state.ann).put('/api/goals', { goals: [{ kind: 'playDays', target: 8 }] })).status).toBe(422);
        expect((await as(state.ann).put('/api/goals', {})).status).toBe(422);
        // nothing changed
        expect((await as(state.ann).get('/api/goals')).body.goals).toHaveLength(2);
    });

    it('are none for a global admin, who plays in no club', async () => {
        expect((await as(state.root).get('/api/goals')).body.goals).toEqual([]);
        expect((await as(state.root).put('/api/goals', { goals: [{ kind: 'games', target: 1 }] })).status).toBe(403);
    });

    it('needs a login', async () => {
        expect((await api().get('/api/goals')).status).toBe(401);
    });
});

describe('a training', () => {
    it('counts for the goals and says so to the player who saved it', async () => {
        const res = await training(state.ann);
        expect(res.status).toBe(201);
        // the trainings goal counts it, the score of Bob's 27 not
        expect(res.body.practiceGoals.map(goal => [goal.description, goal.progress, goal.target])).toEqual([['2 trainings', 1, 2]]);
        expect(res.body.goalsReached).toEqual([]);
    });

    it('tells the goal reached once, when it is reached', async () => {
        const res = await training(state.ann);
        expect(res.body.goalsReached).toEqual([{ id: state.goals[0].id, description: '2 trainings' }]);
        expect((await training(state.ann)).body.goalsReached).toEqual([]);
        const told = await db.notification.find({ user: state.annId, kind: 'practiceGoalReached' }).lean();
        expect(told.map(notice => notice.title)).toEqual(['Goal reached: 2 trainings']);
        // and it stays reached for the week
        const goals = (await as(state.ann).get('/api/goals')).body.goals;
        expect(goals[0]).toMatchObject({ progress: 3, reached: true });
        expect(goals[0].reachedAt).toBeTruthy();
    });

    it('saved by the club admin counts too, without showing the admin the goals', async () => {
        const res = await training(state.ben);
        expect(res.status).toBe(201);
        expect(res.body.practiceGoals).toBeUndefined();
        expect((await as(state.ann).get('/api/goals')).body.goals[0].progress).toBe(4);
    });

    it('keeps a goal that stays the same, and starts a changed one over', async () => {
        const res = await as(state.ann).put('/api/goals', { goals: [state.goals[0], { ...state.goals[1], target: 90 }] });
        expect(res.body.goals[0]).toMatchObject({ id: state.goals[0].id, reached: true });
        expect(res.body.goals[1].id).not.toBe(state.goals[1].id);
    });
});

describe('the past weeks', () => {
    it('show the week that ended once it is closed, with the weeks in a row', async () => {
        const { closePracticeWeeks } = await import('../../src/utils/practice.goals.js');
        // two trainings of Ann last week, put straight into the database
        const lastWeek = new Date(Date.now() - 7 * DAY);
        await db.atc.collection.insertMany([0, 1].map(() => ({ club: db.mongoose.Types.ObjectId.createFromHexString(state.club), mode: 'Single', scoring: 'Time', timeMs: 90000, player: { id: state.annPlayer, nickname: 'Annie' }, createdAt: lastWeek, updatedAt: lastWeek })));
        await as(state.ann).put('/api/goals', { goals: [{ kind: 'trainings', target: 2 }] });
        expect(await closePracticeWeeks(new Date())).toBe(1);
        // closed once: a second run leaves it
        expect(await closePracticeWeeks(new Date())).toBe(0);

        const history = await as(state.ann).get('/api/goals/history?weeks=4');
        expect(history.status).toBe(200);
        expect(history.body.weeks).toHaveLength(1);
        expect(history.body.weeks[0]).toMatchObject({ allReached: true, goals: [{ description: '2 trainings', progress: 2, reached: true }] });
        // last week and this one: two in a row
        const overview = (await as(state.ann).get('/api/goals')).body;
        expect(overview.streak).toBe(2);
        expect(overview.recent.slice(-2).map(entry => entry.state)).toEqual(['reached', 'reached']);
        expect((await as(state.ann).get('/api/goals/history?weeks=99')).status).toBe(422);
    });
});
