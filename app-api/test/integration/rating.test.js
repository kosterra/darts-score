import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

// the app reads these at import; set them before importing it
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';

/**
 * The club rating through the real app and an in-memory MongoDB: the board
 * of the dashboard (members only, settled, playing within a year), a player's
 * rating and its history (only for players known in the club), a shared
 * tournament's games counted as a whole although each club keeps its own
 * players, the seeded draw across clubs, and the chances on open matches.
 * The maths are in utils/compare.test.js.
 */

let mongod;
let db;
let app;
const state = {};

const api = () => supertest(app);
const DAY = 24 * 60 * 60 * 1000;
let sequence = 0;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    const { hashPassword } = await import('../../src/utils/auth.utils.js');

    const passwordHash = await hashPassword('Passw0rd!');
    const alice = await db.user.create({ email: 'alice@test.local', firstname: 'Alice', lastname: 'Tester', passwordHash });
    const clubA = await db.club.create({ name: 'Alpha Darts Club', admins: [alice._id] });
    const clubB = await db.club.create({ name: 'Bravo Darts Club', admins: [] });
    const mkPlayer = (nickname, clubId, extra = {}) =>
        db.player.create({ nickname, firstname: nickname, lastname: 'Player', clubs: [clubId], dateOfBirth: new Date('1990-05-15'), ...extra });
    const [ann, amy, abe, ada, old] = await Promise.all(['Ann', 'Amy', 'Abe', 'Ada', 'Old'].map(name => mkPlayer(name, clubA._id)));
    const guest = await mkPlayer('Gus', clubA._id, { guest: true });
    const [ben, bea] = await Promise.all(['Ben', 'Bea'].map(name => mkPlayer(name, clubB._id)));
    const id = (player) => String(player._id);

    // a game of a club: one tally, as the app keeps it when a game is finished
    const now = Date.now();
    const tally = (club, winner, loser, at = new Date(now - DAY + sequence * 1000), sourceId = `g${++sequence}`) =>
        db.clubTally.create({ club, sourceType: 'x01', sourceId, at, players: [id(winner), id(loser)].filter(Boolean), winners: winner ? [id(winner)] : [] });
    // Ann beats Amy six times, Amy beats Abe six times: Ann > Amy > Abe, all settled
    for (let n = 0; n < 6; n += 1) await tally(clubA._id, ann, amy);
    for (let n = 0; n < 6; n += 1) await tally(clubA._id, amy, abe);
    // Ada played twice only: still settling; the guest won a lot but is no member of the board
    await tally(clubA._id, ada, abe);
    await tally(clubA._id, ada, abe);
    for (let n = 0; n < 6; n += 1) await tally(clubA._id, guest, abe);
    // Old was strong but has not played for two years
    for (let n = 0; n < 6; n += 1) await tally(clubA._id, old, abe, new Date(now - 800 * DAY + n * 1000));

    Object.assign(state, {
        clubA: String(clubA._id), clubB: String(clubB._id), clubAId: clubA._id, clubBId: clubB._id, tally,
        ann: id(ann), amy: id(amy), abe: id(abe), ada: id(ada), old: id(old), guest: id(guest), ben: id(ben), bea: id(bea),
        players: { ann, amy, abe, ada, ben, bea },
    });
    const login = await api().post('/api/auth/login').send({ email: 'alice@test.local', password: 'Passw0rd!' });
    if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
    state.cookie = login.headers['set-cookie'];
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const get = (path, club = state.clubA) => api().get(path).set('Cookie', state.cookie).set('X-Club-Id', club);
const post = (path, body = {}, club = state.clubA) => api().post(path).set('Cookie', state.cookie).set('X-Club-Id', club).send(body);

describe('the club rating', () => {
    it('the dashboard board: settled members who played within a year, strongest first', async () => {
        const res = await get('/api/stats/club');
        expect(res.status).toBe(200);
        const board = res.body.leaderboards.rating;
        expect(board.map(row => row.player)).toEqual([state.ann, state.amy, state.abe]);
        expect(board[0]).toMatchObject({ value: expect.any(Number), games: 6 });
        expect(board[0].value).toBeGreaterThan(board[1].value);
    });

    it('a player\'s rating with the place on the board, and still settling below five games', async () => {
        const ann = await get(`/api/stats/player/${state.ann}`);
        expect(ann.status).toBe(200);
        expect(ann.body.rating).toMatchObject({ games: 6, provisional: false, rank: 1, of: 3 });
        expect(ann.body.rating.best).toBeGreaterThanOrEqual(ann.body.rating.rating);
        const ada = await get(`/api/stats/player/${state.ada}`);
        expect(ada.body.rating).toMatchObject({ games: 2, provisional: true, rank: null, best: null });
    });

    it('the history for the chart and the latest changes with the opponents', async () => {
        const res = await get(`/api/stats/player/${state.amy}/rating`);
        expect(res.status).toBe(200);
        expect(res.body.history.length).toBeGreaterThan(0);
        expect(res.body.history.at(-1).rating).toBe((await get(`/api/stats/player/${state.amy}`)).body.rating.rating);
        expect(res.body.lastChanges).toHaveLength(10);
        // the newest first: Amy's last games were her wins against Abe
        expect(res.body.lastChanges[0]).toMatchObject({ change: expect.any(Number), opponents: [{ id: state.abe, nickname: 'Abe' }] });
        expect(res.body.lastChanges[0].change).toBeGreaterThan(0);
    });

    it('only for players known in the club', async () => {
        expect((await get(`/api/stats/player/${state.ben}/rating`)).status).toBe(404);
        expect((await get('/api/stats/player/not-an-id/rating')).status).toBe(404);
        expect((await get(`/api/stats/player/${state.ann}/rating`, state.clubB)).status).toBe(403);
    });
});

describe('a shared tournament', () => {
    it('counts its games as a whole in each club, though each club keeps only its own players', async () => {
        // Ben (club B) beat Abe (club A) in a shared tournament: club A's tally has only Abe, club B's only Ben
        const at = new Date();
        const game = new db.mongoose.Types.ObjectId();
        await db.clubTally.create({ club: state.clubAId, sourceType: 'x01', sourceId: String(game), at, players: [state.abe], winners: [] });
        await db.clubTally.create({ club: state.clubBId, sourceType: 'x01', sourceId: String(game), at, players: [state.ben], winners: [state.ben] });
        const before = (await get(`/api/stats/player/${state.abe}`)).body.rating.games;
        await db.tournament.create({
            club: state.clubAId, invitedClubs: [state.clubBId], name: 'Played Cup', status: 'finished', closesAt: new Date(),
            matches: [{ id: '2-0', size: 2, index: 0, players: [state.ben, state.abe], status: 'done', winner: state.ben, game }],
        });
        const after = (await get(`/api/stats/player/${state.abe}`)).body.rating.games;
        expect(after).toBe(before + 1);
    });

    it('the seeded draw ranks by the rating of every club taking part, and open matches show the chances', async () => {
        // Bea (club B) beats Ben six times in club B: settled and the strongest of club B
        for (let n = 0; n < 6; n += 1) await state.tally(state.clubBId, state.players.bea, state.players.ben);
        const entries = [
            ...[state.ann, state.amy, state.abe].map(player => ({ player, club: state.clubAId, status: 'in' })),
            ...[state.bea, state.ben].map(player => ({ player, club: state.clubBId, status: 'in' })),
        ];
        const rules = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1 };
        const tournament = await db.tournament.create({
            club: state.clubAId, invitedClubs: [state.clubBId], name: 'Friendship Cup', status: 'closed', maxPlayers: 8,
            closesAt: new Date(), entries, rounds: [2, 4, 8].map(size => ({ size, date: new Date(Date.now() + DAY), rules })),
        });
        const draw = await post(`/api/tournaments/${tournament._id}/draw`, { seeding: 'seeded' });
        expect(draw.status).toBe(200);
        const seeds = Object.fromEntries(draw.body.entries.filter(entry => entry.seed).map(entry => [entry.seed, entry.player]));
        // Ann and Bea are the two strongest; who is first follows from their ratings
        expect(new Set([seeds[1], seeds[2]])).toEqual(new Set([state.ann, state.bea]));

        const view = await get(`/api/tournaments/${tournament._id}`);
        const open = view.body.matches.filter(match => match.status === 'ready' && match.players.every(Boolean));
        expect(open.length).toBeGreaterThan(0);
        for (const match of open) {
            expect(Object.keys(match.chances).sort()).toEqual([...match.players].sort());
            expect(Object.values(match.chances).reduce((sum, value) => sum + value, 0)).toBe(100);
        }
        // a bye has no chances
        expect(view.body.matches.filter(match => match.bye).every(match => !match.chances)).toBe(true);
    });
});
