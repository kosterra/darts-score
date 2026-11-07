import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * Saving a training of the rules engine through the real app and database:
 * settings the training does not offer are refused (no Scoring of three
 * darts, no Random checkouts of three easy finishes), and a record counts
 * against the trainings with the same settings only.
 */

let mongod;
let db;
let app;
const state = {};
const api = () => supertest(app);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    const { hashPassword } = await import('../../src/utils/auth.utils.js');

    const passwordHash = await hashPassword('Passw0rd!');
    const ann = await db.user.create({ email: 'ann@test.local', firstname: 'Ann', lastname: 'Tester', passwordHash });
    const club = await db.club.create({ name: 'Settings Darts Club', admins: [ann._id] });
    const player = await db.player.create({ nickname: 'Annie', firstname: 'Ann', lastname: 'Tester', clubs: [club._id], dateOfBirth: new Date('1990-05-15'), user: ann._id });
    const res = await api().post('/api/auth/login').send({ email: 'ann@test.local', password: 'Passw0rd!' });
    if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
    Object.assign(state, { cookie: res.headers['set-cookie'], club: String(club._id), player: String(player._id) });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const save = (body) => api().post('/api/training/rules')
    .set('Cookie', state.cookie).set('X-Club-Id', state.club)
    .send({ player: { id: state.player }, ...body });
// a Scoring of so many darts, all at one field
const scoring = (darts, field = 'S20') => Array(darts).fill(field);

describe('the settings of a training', () => {
    it('refuses an option the training does not offer', async () => {
        // three darts: a ton-plus average after one visit
        const three = await save({ kind: 'scoring', score: 180, settings: { darts: 3 }, darts: scoring(3, 'T20') });
        expect(three.status).toBe(422);
        expect(three.body.errors).toEqual(['darts must be one of: 30, 60, 99.']);
        expect((await save({ kind: 'bulls', score: 100, settings: { darts: 1 }, darts: ['D25'] })).status).toBe(422);
        expect((await save({ kind: 'shortleg', score: 0, settings: { legs: 0 }, darts: [] })).status).toBe(422);
        expect((await save({ kind: 'scoring', score: 60, settings: { darts: 30, rounds: 1 }, darts: scoring(30) })).body.errors).toEqual(['rounds is not a setting of this training.']);
        expect((await save({ kind: 'scoring', score: 60, settings: [30], darts: scoring(30) })).status).toBe(422);
        expect(await db.rulesTraining.countDocuments()).toBe(0);
    });

    it('refuses finishes Random checkouts would not draw', async () => {
        const easy = await save({ kind: 'randomcheckouts', score: 100, settings: { attempts: 3, targets: [2, 2, 2] }, darts: ['D1', 'D1', 'D1'] });
        expect(easy.status).toBe(422);
        const twos = await save({ kind: 'randomcheckouts', score: 100, settings: { attempts: 10, targets: Array(10).fill(2) }, darts: Array(10).fill('D1') });
        expect(twos.status).toBe(201);
        const none = await save({ kind: 'randomcheckouts', score: 100, settings: { attempts: 10 }, darts: Array(10).fill('D20') });
        expect(none.status).toBe(422);
        expect(none.body.errors).toEqual(['targets is not what this training draws at its start.']);
        const bogey = await save({ kind: 'randomcheckouts', score: 100, settings: { attempts: 10, targets: [...Array(9).fill(40), 169] }, darts: Array(10).fill('D20') });
        expect(bogey.status).toBe(422);
    });

    it('takes the settings it offers, and a training without any as the defaults', async () => {
        const res = await save({ kind: 'scoring', score: 60, settings: { darts: 30 }, darts: scoring(30) });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ score: 60, isRecord: false, previousBest: null });
        expect((await save({ kind: 'bobs27', score: 0, darts: Array(15).fill('M') })).status).toBe(201);
    });
});

describe('records per board', () => {
    it('compares a score only with the trainings of the same settings', async () => {
        // 99 darts at an average of 45: not beaten by the 60 of 30 darts, the first of its board
        const longer = await save({ kind: 'scoring', score: 45, settings: { darts: 99 }, darts: scoring(99, 'S15') });
        expect(longer.status).toBe(201);
        expect(longer.body).toMatchObject({ isRecord: false, previousBest: null });
        // an older training without settings is on the default board (30 darts)
        await db.rulesTraining.create({ club: state.club, kind: 'scoring', settings: {}, darts: scoring(30, 'S19'), score: 57, player: { id: state.player, nickname: 'Annie' } });
        // 29 × 20 and a treble 20: an average of 64 over the 60 before, not over the 45 of 99 darts
        const again = await save({ kind: 'scoring', score: 64, settings: { darts: 30 }, darts: [...scoring(29), 'T20'] });
        expect(again.status).toBe(201);
        expect(again.body).toMatchObject({ score: 64, isRecord: true, previousBest: 60 });
        const better = await save({ kind: 'scoring', score: 48, settings: { darts: 99 }, darts: scoring(99, 'S16') });
        expect(better.body).toMatchObject({ isRecord: true, previousBest: 45 });
    });
});
