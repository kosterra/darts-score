import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * The level every player played at, against a real database: worked out when
 * a game or training is saved (whatever the app sends), worked out again for
 * what was stored before without touching anything else, and the lists
 * filtered by it.
 */

let mongod;
let db;
let app;
let recomputePlayLevels;
const state = {};
const api = () => supertest(app);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    ({ recomputePlayLevels } = await import('../../src/utils/migrations.js'));
    const { hashPassword } = await import('../../src/utils/auth.utils.js');
    const passwordHash = await hashPassword('Passw0rd!');
    const alice = await db.user.create({ email: 'alice@levels.local', firstname: 'Alice', lastname: 'Tester', passwordHash });
    const club = await db.club.create({ name: 'Levels Darts Club', admins: [alice._id] });
    const login = await api().post('/api/auth/login').send({ email: 'alice@levels.local', password: 'Passw0rd!' });
    if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
    const players = await Promise.all(['Paul', 'Quinn', 'Rosa'].map(name => db.player.create({ nickname: name, firstname: name, lastname: 'Player', clubs: [club._id], dateOfBirth: new Date('1990-05-15') })));
    Object.assign(state, { club, cookie: login.headers['set-cookie'], ids: players.map(player => String(player._id)) });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const send = (method, path, body) => api()[method](path).set('Cookie', state.cookie).set('X-Club-Id', String(state.club._id)).send(body ?? {});

const visit = (player, ...darts) => ({ player, darts });
const turns = (count, [a, b], dartsA, dartsB) => Array.from({ length: count }, () => [visit(a, ...dartsA), visit(b, ...dartsB)]).flat();
const X01 = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1, numberOfPlayers: 2 };

describe('saving a game', () => {
    it('keeps the level each player played at, worked out from the visits', async () => {
        const [paul, quinn] = state.ids;
        const players = [paul, quinn];
        // what the app sends of the levels is not taken
        const created = await send('post', '/api/games/x01', { ...X01, players, visits: [], playLevels: [{ player: paul, level: 'worldClass' }] });
        expect(created.status).toBe(201);
        const id = String(created.body.id ?? created.body._id);
        expect((await db.x01.findById(id).lean()).playLevels).toEqual([]);
        // 60 a visit against 15: pro and beginner
        const saved = await send('put', `/api/games/x01/${id}`, { ...X01, players, visits: turns(4, players, ['S20', 'S20', 'S20'], ['S5', 'S5', 'S5']) });
        expect(saved.status).toBe(200);
        expect((await db.x01.findById(id).lean()).playLevels).toEqual([{ player: paul, level: 'pro' }, { player: quinn, level: 'beginner' }]);
        state.x01 = id;
    });

    it('keeps it for a game of the rules engine and a training', async () => {
        const [paul, quinn] = state.ids;
        const game = await send('post', '/api/games/rules', { kind: 'shanghai', settings: {}, players: [paul, quinn], visits: [visit(paul, 'T1', '0', '0'), visit(quinn, '0', '0', '0'), visit(paul, 'T2', '0', '0'), visit(quinn, '0', '0', '0'), visit(paul, 'T3', '0', '0'), visit(quinn, '0', '0', '0')] });
        expect(game.status).toBe(201);
        expect((await db.rulesGame.findById(game.body.id).lean()).playLevels).toEqual([{ player: paul, level: 'semiPro' }, { player: quinn, level: 'beginner' }]);
        const training = await send('post', '/api/training/rules', { kind: 'scoring', settings: { darts: 30 }, darts: Array(30).fill('T20'), score: 180, player: { id: paul } });
        expect(training.status).toBe(201);
        expect((await db.rulesTraining.findById(training.body.id).lean()).playLevels).toEqual([{ player: paul, level: 'elite' }]);
    });
});

describe('the lists filtered by level', () => {
    it('give the games anyone played at the level, or the chosen player', async () => {
        const [paul, quinn, rosa] = state.ids;
        // a game of Rosa and Quinn: 81 a visit is world class for Rosa, 15 beginner for Quinn
        const other = await send('post', '/api/games/x01', { ...X01, players: [rosa, quinn], visits: turns(4, [rosa, quinn], ['T20', 'S20', 'S1'], ['S5', 'S5', 'S5']) });
        expect(other.status).toBe(201);
        const ids = (response) => response.body.map(game => String(game.id ?? game._id)).sort();

        const all = await send('get', '/api/games/x01');
        expect(all.status).toBe(200);
        expect(all.body.find(game => String(game.id) === state.x01).playLevels).toEqual([{ player: paul, level: 'pro' }, { player: quinn, level: 'beginner' }]);

        expect(ids(await send('get', '/api/games/x01?level=beginner'))).toEqual([state.x01, String(other.body.id)].sort());
        expect(ids(await send('get', '/api/games/x01?level=worldClass'))).toEqual([String(other.body.id)]);
        // Quinn played at beginner level in both, Paul in none
        expect(ids(await send('get', `/api/games/x01?level=beginner&player=${quinn}`))).toEqual([state.x01, String(other.body.id)].sort());
        expect(ids(await send('get', `/api/games/x01?level=beginner&player=${paul}`))).toEqual([]);
        expect(ids(await send('get', `/api/games/x01?level=pro&player=${paul}`))).toEqual([state.x01]);
        // the trainings too
        const trainings = await send('get', '/api/training/rules?level=elite');
        expect(trainings.body).toHaveLength(1);
        expect((await send('get', '/api/training/rules?level=beginner')).body).toHaveLength(0);
    });

    it('refuses what is not a level', async () => {
        const wrong = await send('get', '/api/games/x01?level=legend');
        expect(wrong.status).toBe(422);
        // nor a step of the four of the scale before
        for (const old of ['pub', 'worldclass']) expect((await send('get', `/api/games/x01?level=${old}`)).status).toBe(422);
        for (const level of ['beginner', 'hobby', 'amateur', 'semiPro', 'pro', 'worldClass', 'elite']) expect((await send('get', `/api/games/x01?level=${level}`)).status).toBe(200);
        // an operator is no level: the query string stays plain, so it filters nothing
        const injected = await send('get', '/api/games/x01?level[$ne]=pub');
        expect(injected.status).toBe(200);
        expect(injected.body).toHaveLength((await send('get', '/api/games/x01')).body.length);
    });
});

describe('the migration of the levels', () => {
    it('works the levels out again for everything stored, old steps and none alike, and nothing else', async () => {
        const [paul, quinn] = state.ids;
        const old = new Date('2026-01-02T10:00:00Z');
        // stored before there were levels: straight into the collections, with their own times
        const x01 = await db.x01.collection.insertOne({
            ...X01, club: state.club._id, players: [paul, quinn], visits: turns(4, [paul, quinn], ['T20', 'S20', 'S20'], ['S20', 'S20', 'S1']),
            gameIsRunning: true, hasWinner: false, createdAt: old, updatedAt: old, __v: 0,
        });
        // stored with the four steps of the scale before (pub, amateur, pro, world class)
        const stale = await db.x01.collection.insertOne({
            ...X01, club: state.club._id, players: [paul, quinn], visits: turns(4, [paul, quinn], ['T20', 'S20', 'S1'], ['S5', 'S5', 'S5']),
            playLevels: [{ player: paul, level: 'pro' }, { player: quinn, level: 'pub' }],
            gameIsRunning: true, hasWinner: false, createdAt: old, updatedAt: old, __v: 0,
        });
        const staleTraining = await db.rulesTraining.collection.insertOne({
            kind: 'scoring', settings: { darts: 30 }, darts: Array(30).fill('S20'), score: 60, club: state.club._id, player: { id: paul, nickname: 'Paul' },
            playLevels: [{ player: paul, level: 'amateur' }], createdAt: old, updatedAt: old, __v: 0,
        });
        const atc = await db.atc.collection.insertOne({ club: state.club._id, mode: 'All', scoring: 'Darts', darts: 30, player: { id: paul, nickname: 'Paul' }, createdAt: old, updatedAt: old, __v: 0 });
        const clock = await db.atc.collection.insertOne({ club: state.club._id, mode: 'All', scoring: 'Time', timeMs: 4000, player: { id: paul, nickname: 'Paul' }, createdAt: old, updatedAt: old, __v: 0 });
        const find = () => Promise.all([
            db.x01.collection.findOne({ _id: x01.insertedId }), db.x01.collection.findOne({ _id: stale.insertedId }),
            db.rulesTraining.collection.findOne({ _id: staleTraining.insertedId }),
            db.atc.collection.findOne({ _id: atc.insertedId }), db.atc.collection.findOne({ _id: clock.insertedId }),
        ]);
        const before = await find();
        const saved = await db.x01.findById(state.x01).lean();
        const total = { x01: await db.x01.countDocuments(), atc: await db.atc.countDocuments(), rulesTraining: await db.rulesTraining.countDocuments() };

        const counts = await recomputePlayLevels();
        // every document, also those that had levels
        expect(counts.x01).toBe(total.x01);
        expect(counts.atc).toBe(total.atc);
        expect(counts.rulesTraining).toBe(total.rulesTraining);

        const after = await find();
        // 100 a visit against 41: elite and amateur; 81 against 15: world class and beginner; 60 a
        // visit in Scoring: semi-pro (all at T20); 21 targets in 30 darts (70 %): amateur; a time: none
        expect(after[0].playLevels).toEqual([{ player: paul, level: 'elite' }, { player: quinn, level: 'amateur' }]);
        expect(after[1].playLevels).toEqual([{ player: paul, level: 'worldClass' }, { player: quinn, level: 'beginner' }]);
        expect(after[2].playLevels).toEqual([{ player: paul, level: 'semiPro' }]);
        expect(after[3].playLevels).toEqual([{ player: paul, level: 'amateur' }]);
        expect(after[4].playLevels).toEqual([]);
        // everything else as it was, "last updated" too
        after.forEach((doc, index) => {
            const { playLevels, ...rest } = doc;
            const restBefore = { ...before[index] };
            delete restBefore.playLevels;
            expect(playLevels).toBeDefined();
            expect(rest).toEqual(restBefore);
        });
        // what had its levels on this scale stays as it was
        expect(await db.x01.findById(state.x01).lean()).toEqual(saved);
        // no step of the scale before is left anywhere
        const { LEVELS } = await import('../../src/rules/levels.play.js');
        for (const Model of [db.x01, db.cricket, db.elimination, db.clock, db.rulesGame, db.x01Training, db.rulesTraining, db.atc]) {
            expect(await Model.collection.countDocuments({ playLevels: { $elemMatch: { level: { $nin: LEVELS } } } })).toBe(0);
        }
        // and once more: the same again
        await recomputePlayLevels();
        expect(await find()).toEqual(after);
    });
});
