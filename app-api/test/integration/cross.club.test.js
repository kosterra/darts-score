import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

// the app reads these at import; set them before importing it
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';

/**
 * Drives the real Express app (routes + middleware) against an in-memory
 * MongoDB, to guard the cross-club authorization of shared tournaments: the
 * connection flow, that only the host runs the tournament, that a club admin
 * manages only its own players, and that only a participating club can reach a
 * shared match's game. These are the boundaries the penetration test cares
 * about; the unit tests cover the logic underneath (see utils/tournaments.test.js).
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
    const mkUser = (email) => db.user.create({ email, firstname: 'F', lastname: 'Tester', passwordHash });
    const mkPlayer = (nickname, clubId, user = null) =>
        db.player.create({ nickname, firstname: nickname, lastname: 'Player', clubs: [clubId], dateOfBirth: new Date('1990-05-15'), user });

    // eve has an account but no club, to probe the boundaries as an outsider
    const [alice, bob] = await Promise.all([mkUser('alice@test.local'), mkUser('bob@test.local'), mkUser('eve@test.local')]);
    const clubA = await db.club.create({ name: 'Alpha Darts Club', admins: [alice._id] });
    const clubB = await db.club.create({ name: 'Bravo Darts Club', admins: [bob._id] });
    const aPlayers = await Promise.all(['Ann', 'Amy', 'Abe', 'Ada'].map(n => mkPlayer(n, clubA._id)));
    const bPlayers = await Promise.all(['Ben', 'Bea', 'Bix'].map(n => mkPlayer(n, clubB._id)));

    const login = async (email) => {
        const res = await api().post('/api/auth/login').send({ email, password: 'Passw0rd!' });
        if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
        return res.headers['set-cookie'];
    };
    Object.assign(state, {
        alice: await login('alice@test.local'),
        bob: await login('bob@test.local'),
        eve: await login('eve@test.local'),
        clubA: String(clubA._id), clubB: String(clubB._id),
        aPlayers: aPlayers.map(p => String(p._id)), bPlayers: bPlayers.map(p => String(p._id)),
    });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

// a request as a given identity, optionally in a given club
const as = (cookie, clubId) => {
    const attach = (req) => { req.set('Cookie', cookie); if (clubId) req.set('X-Club-Id', clubId); return req; };
    return {
        get: (path) => attach(api().get(path)),
        post: (path, body) => attach(api().post(path)).send(body ?? {}),
        put: (path, body) => attach(api().put(path)).send(body ?? {}),
        del: (path) => attach(api().delete(path)),
    };
};

describe('club connections', () => {
    it('only an admin of the club can ask another club to connect', async () => {
        const res = await as(state.eve).post(`/api/clubs/${state.clubA}/connections`, { clubId: state.clubB });
        expect(res.status).toBe(403);
    });

    it('the host asks, only the asked club decides, and both become connected', async () => {
        const asked = await as(state.alice).post(`/api/clubs/${state.clubA}/connections`, { clubId: state.clubB });
        expect(asked.status).toBe(201);
        state.linkId = asked.body.id;

        // the club that asked cannot accept its own request
        const selfAccept = await as(state.alice).put(`/api/clubs/${state.clubA}/connections/${state.linkId}`, { accept: true });
        expect(selfAccept.status).toBe(403);

        // B sees it as incoming and accepts
        const bList = await as(state.bob).get(`/api/clubs/${state.clubB}/connections`);
        expect(bList.body.find(l => l.incoming)?.club).toBe(state.clubA);
        const accept = await as(state.bob).put(`/api/clubs/${state.clubB}/connections/${state.linkId}`, { accept: true });
        expect(accept.status).toBe(200);
        expect(accept.body.status).toBe('accepted');
    });
});

describe('a shared tournament', () => {
    const round = (size) => ({ size, date: new Date(Date.now() + (16 - size) * DAY).toISOString(), rules: { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1 } });

    it('the host creates it and invites a connected club; the guest club sees it, an outsider cannot', async () => {
        const create = await as(state.alice, state.clubA).post('/api/tournaments', {
            name: 'Friendship Cup', maxPlayers: 8, closesAt: new Date(Date.now() + 3600000).toISOString(),
            format: 'knockout', invite: 'banner', invitedClubs: [state.clubB], open: true, rounds: [2, 4, 8].map(round),
        });
        expect(create.status).toBe(201);
        expect(create.body.shared).toBe(true);
        state.tId = create.body.id;

        const bList = await as(state.bob, state.clubB).get('/api/tournaments');
        expect(bList.body.tournaments.some(t => t.id === state.tId)).toBe(true);

        // Eve is not a member of either club: no access through club A's header
        const eve = await as(state.eve, state.clubA).get(`/api/tournaments/${state.tId}`);
        expect(eve.status).toBe(403);
    });

    it('each club admin enters only its own players, and cannot run the host\'s tournament', async () => {
        // host enters its players
        for (const p of state.aPlayers) {
            const r = await as(state.alice, state.clubA).put(`/api/tournaments/${state.tId}/entries/${p}`, { status: 'in' });
            expect(r.status).toBe(200);
        }
        // guest admin enters its own players
        for (const p of state.bPlayers) {
            const r = await as(state.bob, state.clubB).put(`/api/tournaments/${state.tId}/entries/${p}`, { status: 'in' });
            expect(r.status).toBe(200);
        }
        // guest admin cannot enter a host-club player
        const crossEnter = await as(state.bob, state.clubB).put(`/api/tournaments/${state.tId}/entries/${state.aPlayers[0]}`, { status: 'in' });
        expect(crossEnter.status).toBe(404);
        // guest admin cannot close the host's registration (host-only)
        const close = await as(state.bob, state.clubB).post(`/api/tournaments/${state.tId}/close`);
        expect(close.status).toBe(404);

        const view = await as(state.alice, state.clubA).get(`/api/tournaments/${state.tId}`);
        expect(view.body.counts.in).toBe(state.aPlayers.length + state.bPlayers.length);
    });

    it('a participating club can reach a shared match\'s game; an outsider and other clubs cannot', async () => {
        await as(state.alice, state.clubA).post(`/api/tournaments/${state.tId}/close`);
        const draw = await as(state.alice, state.clubA).post(`/api/tournaments/${state.tId}/draw`, { seeding: 'random' });
        expect(draw.status).toBe(200);
        // the draw mixes the clubs (entries from both are in the bracket)
        const clubOf = Object.fromEntries(draw.body.entries.map(e => [e.player, e.club]));
        expect(new Set(Object.values(clubOf)).size).toBe(2);
        // the game belongs to the shared tournament, so any participating club may load it,
        // whichever clubs the match's two players come from; pick the first playable match
        const match = draw.body.matches.find(m => m.status === 'ready' && m.players[0] && m.players[1]);
        expect(match).toBeTruthy();

        const start = await as(state.alice, state.clubA).post(`/api/tournaments/${state.tId}/matches/${match.id}/start`, { first: match.players[0] });
        expect(start.status).toBe(201);
        const gameId = start.body.game;

        // the guest club can load the host-owned game because it takes part
        const guest = await as(state.bob, state.clubB).get(`/api/games/x01/${gameId}`);
        expect(guest.status).toBe(200);

        // an outsider cannot (not a member of the club in the header)
        const outsider = await as(state.eve, state.clubB).get(`/api/games/x01/${gameId}`);
        expect(outsider.status).toBe(403);

        // a plain (non-tournament) game of club A is not reachable from club B
        const plain = await as(state.alice, state.clubA).post('/api/games/x01', {
            players: [state.aPlayers[0], state.aPlayers[1]], numberOfPlayers: 2, visits: [],
            startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', legMode: 'First to', numberOfSets: 1, numberOfLegs: 1,
        });
        expect(plain.status).toBe(201);
        const reach = await as(state.bob, state.clubB).get(`/api/games/x01/${plain.body._id ?? plain.body.id}`);
        expect(reach.status).toBe(404);
    });
});
