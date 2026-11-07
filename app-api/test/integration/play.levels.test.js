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
 * a game or training is saved (whatever the app sends), filled in once for
 * what was stored before without touching anything else, and the lists
 * filtered by it.
 */

let mongod;
let db;
let app;
let fillPlayLevels;
const state = {};
const api = () => supertest(app);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    ({ fillPlayLevels } = await import('../../src/utils/migrations.js'));
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
        // 60 a visit against 15: amateur and pub
        const saved = await send('put', `/api/games/x01/${id}`, { ...X01, players, visits: turns(4, players, ['S20', 'S20', 'S20'], ['S5', 'S5', 'S5']) });
        expect(saved.status).toBe(200);
        expect((await db.x01.findById(id).lean()).playLevels).toEqual([{ player: paul, level: 'amateur' }, { player: quinn, level: 'pub' }]);
        state.x01 = id;
    });

    it('keeps it for a game of the rules engine and a training', async () => {
        const [paul, quinn] = state.ids;
        const game = await send('post', '/api/games/rules', { kind: 'shanghai', settings: {}, players: [paul, quinn], visits: [visit(paul, 'T1', '0', '0'), visit(quinn, '0', '0', '0'), visit(paul, 'T2', '0', '0'), visit(quinn, '0', '0', '0'), visit(paul, 'T3', '0', '0'), visit(quinn, '0', '0', '0')] });
        expect(game.status).toBe(201);
        expect((await db.rulesGame.findById(game.body.id).lean()).playLevels).toEqual([{ player: paul, level: 'pro' }, { player: quinn, level: 'pub' }]);
        const training = await send('post', '/api/training/rules', { kind: 'scoring', settings: { darts: 30 }, darts: Array(30).fill('T20'), score: 180, player: { id: paul } });
        expect(training.status).toBe(201);
        expect((await db.rulesTraining.findById(training.body.id).lean()).playLevels).toEqual([{ player: paul, level: 'worldClass' }]);
    });
});

describe('the lists filtered by level', () => {
    it('give the games anyone played at the level, or the chosen player', async () => {
        const [paul, quinn, rosa] = state.ids;
        // a game of Rosa and Quinn at pro level for Rosa
        const other = await send('post', '/api/games/x01', { ...X01, players: [rosa, quinn], visits: turns(4, [rosa, quinn], ['T20', 'S20', 'S1'], ['S5', 'S5', 'S5']) });
        expect(other.status).toBe(201);
        const ids = (response) => response.body.map(game => String(game.id ?? game._id)).sort();

        const all = await send('get', '/api/games/x01');
        expect(all.status).toBe(200);
        expect(all.body.find(game => String(game.id) === state.x01).playLevels).toEqual([{ player: paul, level: 'amateur' }, { player: quinn, level: 'pub' }]);

        expect(ids(await send('get', '/api/games/x01?level=pub'))).toEqual([state.x01, String(other.body.id)].sort());
        expect(ids(await send('get', '/api/games/x01?level=pro'))).toEqual([String(other.body.id)]);
        // Quinn played at pub level in both, Paul in none
        expect(ids(await send('get', `/api/games/x01?level=pub&player=${quinn}`))).toEqual([state.x01, String(other.body.id)].sort());
        expect(ids(await send('get', `/api/games/x01?level=pub&player=${paul}`))).toEqual([]);
        expect(ids(await send('get', `/api/games/x01?level=amateur&player=${paul}`))).toEqual([state.x01]);
        // the trainings too
        const trainings = await send('get', '/api/training/rules?level=worldClass');
        expect(trainings.body).toHaveLength(1);
        expect((await send('get', '/api/training/rules?level=pub')).body).toHaveLength(0);
    });

    it('refuses what is not a level', async () => {
        const wrong = await send('get', '/api/games/x01?level=legend');
        expect(wrong.status).toBe(422);
        // an operator is no level: the query string stays plain, so it filters nothing
        const injected = await send('get', '/api/games/x01?level[$ne]=pub');
        expect(injected.status).toBe(200);
        expect(injected.body).toHaveLength((await send('get', '/api/games/x01')).body.length);
    });
});

describe('the migration of the levels', () => {
    it('fills in the levels of what was stored before, and nothing else', async () => {
        const [paul, quinn] = state.ids;
        const old = new Date('2026-01-02T10:00:00Z');
        // stored before there were levels: straight into the collections, with their own times
        const x01 = await db.x01.collection.insertOne({
            ...X01, club: state.club._id, players: [paul, quinn], visits: turns(4, [paul, quinn], ['T20', 'S20', 'S20'], ['S20', 'S20', 'S1']),
            gameIsRunning: true, hasWinner: false, createdAt: old, updatedAt: old, __v: 0,
        });
        const atc = await db.atc.collection.insertOne({ club: state.club._id, mode: 'All', scoring: 'Darts', darts: 30, player: { id: paul, nickname: 'Paul' }, createdAt: old, updatedAt: old, __v: 0 });
        const clock = await db.atc.collection.insertOne({ club: state.club._id, mode: 'All', scoring: 'Time', timeMs: 4000, player: { id: paul, nickname: 'Paul' }, createdAt: old, updatedAt: old, __v: 0 });
        const before = await Promise.all([db.x01.collection.findOne({ _id: x01.insertedId }), db.atc.collection.findOne({ _id: atc.insertedId }), db.atc.collection.findOne({ _id: clock.insertedId })]);
        const saved = await db.x01.findById(state.x01).lean();

        const counts = await fillPlayLevels();
        expect(counts.x01).toBe(1);
        expect(counts.atc).toBe(2);

        const after = await Promise.all([db.x01.collection.findOne({ _id: x01.insertedId }), db.atc.collection.findOne({ _id: atc.insertedId }), db.atc.collection.findOne({ _id: clock.insertedId })]);
        // 100 a visit against 41: world class and pub; 21 targets in 30 darts: pro; a time: none
        expect(after[0].playLevels).toEqual([{ player: paul, level: 'worldClass' }, { player: quinn, level: 'pub' }]);
        expect(after[1].playLevels).toEqual([{ player: paul, level: 'pro' }]);
        expect(after[2].playLevels).toEqual([]);
        // everything else as it was, "last updated" too
        after.forEach((doc, index) => {
            const { playLevels, ...rest } = doc;
            expect(playLevels).toBeDefined();
            expect(rest).toEqual(before[index]);
        });
        // what had its levels is left alone
        expect(await db.x01.findById(state.x01).lean()).toEqual(saved);
        // and once more: nothing left to do
        expect(Object.values(await fillPlayLevels()).every(count => count === 0)).toBe(true);
    });
});
