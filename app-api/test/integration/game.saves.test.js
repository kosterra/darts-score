import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * The saves of a game against a real database: an older state (a tab left
 * open, a device that was offline) does not replace a newer one, a finished
 * game is not opened again, an undo is taken from the device with the newest
 * state, a game is worked out by the settings it was started with whatever is
 * sent, and its club tally follows what is stored.
 */

let mongod;
let db;
let app;
let clockVisits;
const state = {};
const api = () => supertest(app);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    ({ clockVisits } = await import('../../src/rules/clock.js'));
    const { hashPassword } = await import('../../src/utils/auth.utils.js');
    const passwordHash = await hashPassword('Passw0rd!');
    const alice = await db.user.create({ email: 'alice@saves.local', firstname: 'Alice', lastname: 'Tester', passwordHash });
    const club = await db.club.create({ name: 'Saves Darts Club', admins: [alice._id] });
    const login = await api().post('/api/auth/login').send({ email: 'alice@saves.local', password: 'Passw0rd!' });
    if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
    Object.assign(state, { club, cookie: login.headers['set-cookie'] });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const send = (method, path, body) => api()[method](path).set('Cookie', state.cookie).set('X-Club-Id', String(state.club._id)).send(body ?? {});
const post = (path, body) => send('post', path, body);
const put = (path, body) => send('put', path, body);

let count = 0;
const twoPlayers = async () => {
    count += 1;
    const made = await Promise.all(['Paul', 'Quinn'].map(name => db.player.create({ nickname: `${name}${count}`, firstname: name, lastname: 'Player', clubs: [state.club._id], dateOfBirth: new Date('1990-05-15') })));
    return made.map(player => String(player._id));
};

// one leg of 501: the first player throws 180, 180 and checks out 141
const leg = (a, b) => [
    { player: a, darts: ['T20', 'T20', 'T20'] }, { player: b, darts: ['S20', 'S1', 'S5'] },
    { player: a, darts: ['T20', 'T20', 'T20'] }, { player: b, darts: ['S20', 'S1', 'S5'] },
    { player: a, darts: ['T20', 'T19', 'D12'] },
];
const X01 = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1 };

const newX01 = async (settings = X01, visits = []) => {
    const players = await twoPlayers();
    const created = await post('/api/games/x01', { ...settings, players, numberOfPlayers: 2, visits });
    expect(created.status).toBe(201);
    return { id: String(created.body.id ?? created.body._id), players, body: created.body };
};

describe('a save of an older state', () => {
    it('is refused once the game is decided, and the game stays won', async () => {
        const { id, players } = await newX01();
        const won = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players) });
        expect(won.status).toBe(200);
        expect(won.body.hasWinner).toBe(true);
        const finished = await db.x01.findById(id).lean();
        // a tab left open sends what it had before the winning visit
        const stale = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players).slice(0, 4) });
        expect(stale.status).toBe(409);
        expect(stale.body.message).toMatch(/finished/);
        const after = await db.x01.findById(id).lean();
        expect(after.hasWinner).toBe(true);
        expect(after.visits).toHaveLength(5);
        expect(after.updatedAt.getTime()).toBe(finished.updatedAt.getTime());
        // nor does it take visits after the end
        const more = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: [...leg(...players), { player: players[1], darts: ['S1'] }] });
        expect(more.status).toBe(409);
    });

    it('is refused for a running game built on an older state', async () => {
        const { id, players, body } = await newX01();
        const first = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players).slice(0, 2), basedOn: body.updatedAt });
        expect(first.status).toBe(200);
        // another device, still on the state it loaded, takes a visit back
        const stale = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players).slice(0, 1), basedOn: body.updatedAt });
        expect(stale.status).toBe(409);
        expect(stale.body.message).toMatch(/another device/);
        // or throws on from where it was
        const other = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: [leg(...players)[0], { player: players[1], darts: ['T20', 'T20', 'T20'] }], basedOn: body.updatedAt });
        expect(other.status).toBe(409);
        expect((await db.x01.findById(id).lean()).visits).toHaveLength(2);
    });

    it('takes an undo from the device with the newest state', async () => {
        const { id, players, body } = await newX01();
        const first = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players).slice(0, 2), basedOn: body.updatedAt });
        expect(first.status).toBe(200);
        const undo = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players).slice(0, 1), basedOn: first.body.updatedAt });
        expect(undo.status).toBe(200);
        expect((await db.x01.findById(id).lean()).visits).toHaveLength(1);
    });

    it('lets one of two saves at the same moment through', async () => {
        const { id, players, body } = await newX01();
        const [a, b] = await Promise.all([
            put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: [{ player: players[0], darts: ['S1', 'S1', 'S1'] }], basedOn: body.updatedAt }),
            put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: [{ player: players[0], darts: ['S5', 'S5', 'S5'] }], basedOn: body.updatedAt }),
        ]);
        expect([a.status, b.status].sort()).toEqual([200, 409]);
    });
});

describe('a save with other settings', () => {
    it('plays X01 on by the settings it was started with', async () => {
        const bestOfFive = { ...X01, numberOfLegs: 3 };
        const { id, players } = await newX01(bestOfFive);
        const saved = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players) });
        expect(saved.status).toBe(200);
        expect(saved.body.hasWinner).toBe(false);
        const stored = await db.x01.findById(id).lean();
        expect(stored.numberOfLegs).toBe(3);
        expect(stored.hasWinner).toBe(false);
        expect(stored.playerModels[players[0]].hasWonGame).toBeFalsy();
    });

    it('plays Elimination on to its own target', async () => {
        const players = await twoPlayers();
        const settings = { targetScore: 301, gameInMode: 'Straight In', gameOutMode: 'Double Out' };
        const created = await post('/api/games/elimination', { ...settings, players, numberOfPlayers: 2, visits: [] });
        expect(created.status).toBe(201);
        const id = String(created.body.id ?? created.body._id);
        const saved = await put(`/api/games/elimination/${id}`, { ...settings, targetScore: 101, players, numberOfPlayers: 2, visits: [{ player: players[0], darts: ['T20', 'S1', 'D20'] }] });
        expect(saved.status).toBe(200);
        expect(saved.body.hasWinner).toBe(false);
        const stored = await db.elimination.findById(id).lean();
        expect(stored.targetScore).toBe(301);
        expect(stored.playerModels[players[0]].score).toBe(101);
    });

    it('plays Around the Clock on in its own mode', async () => {
        const players = await twoPlayers();
        const created = await post('/api/games/clock', { mode: 'Triple', numberOfPlayers: 2, players, visits: [] });
        expect(created.status).toBe(201);
        const id = String(created.body.id ?? created.body._id);
        // every dart a hit on Single: the first player is round in 21 darts
        const visits = clockVisits({ players, mode: 'Single' }, Array(60).fill(1));
        const saved = await put(`/api/games/clock/${id}`, { mode: 'Single', numberOfPlayers: 2, players, visits });
        expect(saved.status).toBe(200);
        expect(saved.body.hasWinner).toBe(false);
        expect((await db.clock.findById(id).lean()).mode).toBe('Triple');
    });
});

describe('the club tally of a finished game', () => {
    it('stays with what is stored: a changed finish is refused, the same one keeps its time', async () => {
        const { id, players } = await newX01();
        const won = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players) });
        expect(won.body.hasWinner).toBe(true);
        const tally = await db.clubTally.findOne({ club: state.club._id, sourceId: id }).lean();
        expect(tally.num180s).toBe(2);
        // the same leg finished another way
        const changed = leg(...players);
        changed[2] = { player: players[0], darts: ['T20', 'T20', 'S20'] };
        changed[4] = { player: players[0], darts: ['T20', 'T20', 'T20'] };
        const other = await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: [...changed, { player: players[1], darts: ['S1'] }, { player: players[0], darts: ['D20', 'D1'] }] });
        expect(other.status).toBe(409);
        const after = await db.clubTally.findOne({ club: state.club._id, sourceId: id }).lean();
        expect(after.num180s).toBe(2);
        expect(after.at.getTime()).toBe(tally.at.getTime());
    });

    it('is worked out again when a finished game changed, keeping the time it was first finished', async () => {
        const { saveTally } = await import('../../src/utils/club.badge.service.js');
        const { unchangedFinish } = await import('../../src/utils/game.saves.js');
        const { id, players } = await newX01();
        await put(`/api/games/x01/${id}`, { ...X01, players, numberOfPlayers: 2, visits: leg(...players) });
        const stored = await db.x01.findById(id).lean();
        const first = await db.clubTally.findOne({ club: state.club._id, sourceId: id }).lean();
        // a finished game stored differently (e.g. by an older server) is no unchanged finish: its update moves
        const changed = leg(...players);
        changed[0] = { player: players[0], darts: ['T20', 'T20', 'S20'] };
        expect(unchangedFinish(stored, { ...stored, visits: changed })).toBe(false);
        const later = new Date(stored.updatedAt.getTime() + 1000);
        await db.x01.updateOne({ _id: id }, { $set: { visits: changed, updatedAt: later } }, { timestamps: false });
        expect(await saveTally(state.club._id, 'x01', await db.x01.findById(id).lean())).toBe(false);
        const recounted = await db.clubTally.findOne({ club: state.club._id, sourceId: id }).lean();
        expect(recounted.num180s).toBe(1);
        expect(recounted.at.getTime()).toBe(first.at.getTime());
    });
});
