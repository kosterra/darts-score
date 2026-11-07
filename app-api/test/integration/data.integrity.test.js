import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * What must not be left behind or counted twice, against a real database: a
 * darts evening becomes one club only (and a game still running follows once
 * finished), a deleted club takes everything of its own along, a claim link
 * ends with the membership, moved games take their club tally along, and a
 * finished game sent again keeps the time it was finished.
 */

let mongod;
let db;
let app;
let evenings;
let storedOf;
const state = {};
const api = () => supertest(app);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    evenings = await import('../../src/utils/evenings.js');
    ({ storedOf } = await import('../../src/utils/game.view.js'));
    const { hashPassword } = await import('../../src/utils/auth.utils.js');

    const passwordHash = await hashPassword('Passw0rd!');
    const [alice, bob] = await Promise.all([
        db.user.create({ email: 'alice@test.local', firstname: 'Alice', lastname: 'Tester', passwordHash }),
        db.user.create({ email: 'bob@test.local', firstname: 'Bob', lastname: 'Tester', passwordHash }),
    ]);
    const clubA = await db.club.create({ name: 'Alpha Darts Club', admins: [alice._id] });
    const login = async (email) => {
        const res = await api().post('/api/auth/login').send({ email, password: 'Passw0rd!' });
        if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
        return res.headers['set-cookie'];
    };
    Object.assign(state, { alice, bob, clubA, aliceCookie: await login('alice@test.local') });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const as = (cookie, clubId) => {
    const attach = (req) => { req.set('Cookie', cookie); if (clubId) req.set('X-Club-Id', String(clubId)); return req; };
    return {
        post: (path, body) => attach(api().post(path)).send(body ?? {}),
        put: (path, body) => attach(api().put(path)).send(body ?? {}),
    };
};

const mkPlayer = (nickname, clubs) => db.player.create({ nickname, firstname: nickname, lastname: 'Player', clubs, dateOfBirth: new Date('1990-05-15') });

// one leg of 501: the first player throws 180, 180 and checks out 141
const winningVisits = (a, b) => [
    { player: a, darts: ['T20', 'T20', 'T20'] }, { player: b, darts: ['S20', 'S1', 'S5'] },
    { player: a, darts: ['T20', 'T20', 'T20'] }, { player: b, darts: ['S20', 'S1', 'S5'] },
    { player: a, darts: ['T20', 'T19', 'D12'] },
];
const X01 = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1 };

// ---------------------------------------------------------------------------
// A darts evening becomes a club
// ---------------------------------------------------------------------------

let eveningCount = 0;
const newEvening = async () => {
    eveningCount += 1;
    const evening = await db.quickEvening.create({
        players: [{ id: 'q1', name: 'Anna' }, { id: 'q2', name: 'Ben' }, { id: 'q3', name: 'Cleo' }],
        keyHash: 'hash', shareToken: `share-token-${eveningCount}`,
    });
    const quickGame = async (players, { finished = true } = {}) => {
        const visits = finished ? winningVisits(...players) : winningVisits(...players).slice(0, 2);
        const data = storedOf('x01', {
            ...X01, players, visits, currentPlayerTurn: players[0], flyingDarts: 'off',
            quickPlayers: players.map(id => ({ id, nickname: evening.players.find(player => player.id === id).name })),
        });
        return db.quickGame.create({ kind: 'x01', evening: evening._id, keyHash: 'hash', data, names: [], hasWinner: Boolean(data.hasWinner), gameIsRunning: data.gameIsRunning !== false });
    };
    return { evening, quickGame };
};

describe('a darts evening made a club', () => {
    it('becomes one club only, also with two requests at once', async () => {
        const { evening, quickGame } = await newEvening();
        const finished = await quickGame(['q1', 'q2']);
        expect(finished.hasWinner).toBe(true);
        const clubsBefore = await db.club.countDocuments();
        // two requests, each with the evening as it was loaded before either made the club
        const [first, second] = await Promise.all([db.quickEvening.findById(evening._id), db.quickEvening.findById(evening._id)]);
        const results = await Promise.allSettled([
            evenings.adoptEvening(first, state.bob, { name: 'One' }),
            evenings.adoptEvening(second, state.bob, { name: 'Two' }),
        ]);
        expect(results.map(result => result.status).sort()).toEqual(['fulfilled', 'rejected']);
        expect(results.find(result => result.status === 'rejected').reason.status).toBe(409);
        expect(await db.club.countDocuments()).toBe(clubsBefore + 1);
        const club = results.find(result => result.status === 'fulfilled').value.club;
        expect(await db.player.countDocuments({ clubs: club._id })).toBe(3);
        expect(await db.x01.countDocuments({ club: club._id })).toBe(1);
        expect(await db.clubTally.countDocuments({ club: club._id })).toBe(1);
        const stored = await db.quickEvening.findById(evening._id).lean();
        expect(String(stored.club)).toBe(String(club._id));
        expect(stored.adopting).toBeNull();
        expect(stored.clubPlayers).toHaveLength(3);
    });

    it('takes a game still running then over once it is finished, once', async () => {
        const { evening, quickGame } = await newEvening();
        await quickGame(['q1', 'q2']);
        const running = await quickGame(['q1', 'q3'], { finished: false });
        expect(running.hasWinner).toBe(false);
        const { club, games } = await evenings.adoptEvening(await db.quickEvening.findById(evening._id), state.bob, { name: 'Late Club' });
        expect(games).toBe(1);

        // finished afterwards, as the quick game page saves it
        const data = storedOf('x01', { ...running.data, visits: winningVisits('q1', 'q3') });
        Object.assign(running, { data, hasWinner: Boolean(data.hasWinner), gameIsRunning: false });
        running.markModified('data');
        await running.save();
        expect(running.hasWinner).toBe(true);
        expect(await evenings.takeOverLateGame(running)).toBe(true);
        expect(await evenings.takeOverLateGame(await db.quickGame.findById(running._id))).toBe(false);
        const taken = await db.x01.find({ club: club._id }).lean();
        expect(taken).toHaveLength(2);
        const anna = await db.player.findOne({ clubs: club._id, nickname: 'Anna' });
        const cleo = await db.player.findOne({ clubs: club._id, nickname: 'Cleo' });
        expect(taken.some(game => String(game.players) === String([anna._id, cleo._id]))).toBe(true);
    });

    it('leaves no half club behind when it fails part-way, and can be tried again', async () => {
        const { evening, quickGame } = await newEvening();
        await quickGame(['q1', 'q2']);
        const clubsBefore = await db.club.countDocuments();
        const playersBefore = await db.player.countDocuments();
        const gamesBefore = await db.x01.countDocuments();
        const spy = vi.spyOn(db.x01, 'create').mockRejectedValueOnce(new Error('the database went away'));
        await expect(evenings.adoptEvening(await db.quickEvening.findById(evening._id), state.bob, { name: 'Broken' })).rejects.toThrow('the database went away');
        spy.mockRestore();
        expect(await db.club.countDocuments()).toBe(clubsBefore);
        expect(await db.player.countDocuments()).toBe(playersBefore);
        expect(await db.x01.countDocuments()).toBe(gamesBefore);
        expect(await db.quickEvening.findById(evening._id).lean()).toMatchObject({ club: null, adopting: null, clubPlayers: [] });
        expect(await db.quickGame.countDocuments({ evening: evening._id, takenOver: true })).toBe(0);

        const { club, games } = await evenings.adoptEvening(await db.quickEvening.findById(evening._id), state.bob, { name: 'Second Try' });
        expect(games).toBe(1);
        expect(await db.club.countDocuments()).toBe(clubsBefore + 1);
        expect(await db.x01.countDocuments({ club: club._id })).toBe(1);
    });

    it('removes the half club of a request the server stopped part-way, once the hold is over', async () => {
        const { evening, quickGame } = await newEvening();
        await quickGame(['q1', 'q2']);
        const clubsBefore = await db.club.countDocuments();
        const playersBefore = await db.player.countDocuments();
        // as a request leaves it when the server stops after the club and its players, before the evening is told
        const half = await db.club.create({ name: 'Half', admins: [state.bob._id] });
        await db.player.create([{ firstname: 'Anna', lastname: '-', nickname: 'Anna', clubs: [half._id] }, { firstname: 'Ben', lastname: '-', nickname: 'Ben', clubs: [half._id] }]);
        await db.quickEvening.updateOne({ _id: evening._id }, { $set: { adopting: new Date(Date.now() - 60 * 1000), adoptingClub: half._id } });

        // within the hold: refused, the half club still there
        await expect(evenings.adoptEvening(await db.quickEvening.findById(evening._id), state.bob, { name: 'Again' })).rejects.toMatchObject({ status: 409 });
        expect(await db.club.exists({ _id: half._id })).toBeTruthy();

        // after it: the half club goes with its players, and the evening becomes one club
        await db.quickEvening.updateOne({ _id: evening._id }, { $set: { adopting: new Date(Date.now() - 11 * 60 * 1000) } });
        const { club, games } = await evenings.adoptEvening(await db.quickEvening.findById(evening._id), state.bob, { name: 'Again' });
        expect(games).toBe(1);
        expect(await db.club.exists({ _id: half._id })).toBeNull();
        expect(await db.player.countDocuments({ clubs: half._id })).toBe(0);
        expect(await db.club.countDocuments()).toBe(clubsBefore + 1);
        expect(await db.player.countDocuments()).toBe(playersBefore + 3);
        expect(await db.quickEvening.findById(evening._id).lean()).toMatchObject({ club: club._id, adopting: null, adoptingClub: null });
    });

    it('notes the club it makes on the evening before making it', async () => {
        const { evening } = await newEvening();
        const create = db.club.create.bind(db.club);
        let noted = null;
        const spy = vi.spyOn(db.club, 'create').mockImplementationOnce(async (doc) => {
            noted = (await db.quickEvening.findById(evening._id).lean()).adoptingClub;
            return create(doc);
        });
        const { club } = await evenings.adoptEvening(await db.quickEvening.findById(evening._id), state.bob, { name: 'Noted' });
        spy.mockRestore();
        expect(String(noted)).toBe(String(club._id));
    });
});

// ---------------------------------------------------------------------------
// A club deleted
// ---------------------------------------------------------------------------

describe('a club deleted', () => {
    it('takes its club nights, leagues, connections, reviews and notices along', async () => {
        const { deleteClubData } = await import('../../src/utils/club.deletion.js');
        const gone = await db.club.create({ name: 'Gone Darts Club', admins: [state.bob._id] });
        const player = await mkPlayer('Gina', [gone._id]);
        const id = gone._id;
        await Promise.all([
            db.attendance.create({ club: id, day: '2026-11-07', player: player._id, answer: 'yes' }),
            db.league.create({ club: id, name: 'Winter league', firstDay: new Date() }),
            db.integrityReview.create({ club: id, sourceType: 'x01', sourceId: 'abc', status: 'ok' }),
            db.notification.create({ user: state.bob._id, club: id, kind: 'clubBadge', title: 'A badge' }),
            // a request it sent to Alpha, still waiting
            db.clubLink.create({ clubs: [id, state.clubA._id].sort(), pair: [id, state.clubA._id].map(String).sort().join(':'), requestedClub: id, requestedBy: state.bob._id, status: 'pending' }),
        ]);
        await deleteClubData(gone);
        for (const model of [db.attendance, db.league, db.integrityReview, db.notification]) expect(await model.countDocuments({ club: id })).toBe(0);
        expect(await db.clubLink.countDocuments({ clubs: id })).toBe(0);
        expect(await db.club.countDocuments({ _id: id })).toBe(0);
    });

    it('cannot be connected with by accepting a request it left behind', async () => {
        const ghost = new db.mongoose.Types.ObjectId();
        const link = await db.clubLink.create({
            clubs: [ghost, state.clubA._id].sort(), pair: [ghost, state.clubA._id].map(String).sort().join(':'),
            requestedClub: ghost, requestedBy: state.bob._id, status: 'pending',
        });
        const res = await as(state.aliceCookie).put(`/api/clubs/${state.clubA._id}/connections/${link._id}`, { accept: true });
        expect(res.status).toBe(404);
        expect(await db.clubLink.countDocuments({ _id: link._id })).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Claim links and moved games
// ---------------------------------------------------------------------------

describe('a player leaving a club', () => {
    it('can no longer be claimed with a link made there', async () => {
        const { claimLink, findClaim } = await import('../../src/utils/player.claims.js');
        const { removeFromClub } = await import('../../src/controllers/player.controller.js');
        const other = await db.club.create({ name: 'Other Darts Club', admins: [state.alice._id] });
        const player = await mkPlayer('Pia', [state.clubA._id, other._id]);
        const token = (link) => link.split('/claim/')[1];
        const here = token(await claimLink(player, state.clubA._id, state.alice._id));
        const there = token(await claimLink(player, other._id, state.alice._id));
        expect(await findClaim(here)).not.toBeNull();

        await removeFromClub(player, state.clubA._id);
        expect(await findClaim(here)).toBeNull();
        expect(await db.playerClaim.countDocuments({ player: player._id, club: state.clubA._id })).toBe(0);
        // the link of the club they are still in works
        expect(await findClaim(there)).not.toBeNull();

        // a link left from before (made while a member) does not work either
        const stale = token(await claimLink(player, state.clubA._id, state.alice._id));
        expect(await findClaim(stale)).toBeNull();
    });

    it('takes the games that follow them along with their club tally', async () => {
        const { removeFromClub, addToClub } = await import('../../src/controllers/player.controller.js');
        const { syncGameBadges } = await import('../../src/utils/badge.service.js');
        const from = await db.club.create({ name: 'From Darts Club', admins: [state.alice._id] });
        const to = await db.club.create({ name: 'To Darts Club', admins: [state.alice._id] });
        const [x, y] = await Promise.all([mkPlayer('Xena', [from._id]), mkPlayer('Yves', [from._id])]);
        const ids = [String(x._id), String(y._id)];
        const game = await db.x01.create({ ...storedOf('x01', { ...X01, players: ids, visits: winningVisits(...ids), currentPlayerTurn: ids[0] }), club: from._id });
        expect(game.hasWinner).toBe(true);
        await syncGameBadges(from._id, game.toObject(), 'x01');
        const tally = await db.clubTally.findOne({ club: from._id, sourceId: String(game._id) }).lean();
        expect(tally).not.toBeNull();

        // as the app loads them for the move (their badges were saved meanwhile)
        for (const player of await db.player.find({ _id: { $in: ids } })) {
            expect(await addToClub(player, to)).toBeNull();
            await removeFromClub(player, from._id);
        }
        expect(String((await db.x01.findById(game._id).lean()).club)).toBe(String(to._id));
        expect(await db.clubTally.countDocuments({ club: from._id, sourceId: String(game._id) })).toBe(0);
        const moved = await db.clubTally.findOne({ club: to._id, sourceId: String(game._id) }).lean();
        expect(moved).toMatchObject({ num180s: tally.num180s, players: tally.players });
        expect(new Date(moved.at).getTime()).toBe(new Date(tally.at).getTime());
        // the new club's badges follow what it played now
        expect((await db.club.findById(to._id).lean()).badges.length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// A finished game sent again
// ---------------------------------------------------------------------------

describe('a finished game sent again', () => {
    it('keeps the time it was finished, in the game and its club tally', async () => {
        const [p, q] = await Promise.all([mkPlayer('Paul', [state.clubA._id]), mkPlayer('Quinn', [state.clubA._id])]);
        const ids = [String(p._id), String(q._id)];
        const admin = as(state.aliceCookie, state.clubA._id);
        const started = await admin.post('/api/games/x01', { ...X01, players: ids, numberOfPlayers: 2, visits: winningVisits(...ids).slice(0, 4) });
        expect(started.status).toBe(201);
        const id = String(started.body.id ?? started.body._id);
        // what the app keeps of a game: its settings and visits (the rest is worked out from them)
        const sent = { ...X01, players: ids, numberOfPlayers: 2, visits: winningVisits(...ids) };
        const won = await admin.put(`/api/games/x01/${id}`, sent);
        expect(won.status).toBe(200);
        expect(won.body.hasWinner).toBe(true);
        const finished = await db.x01.findById(id).lean();
        const tally = await db.clubTally.findOne({ club: state.clubA._id, sourceId: id }).lean();
        expect(new Date(tally.at).getTime()).toBe(finished.updatedAt.getTime());

        await new Promise(resolve => setTimeout(resolve, 30));
        // a save retried later, even one claiming another time
        const again = await admin.put(`/api/games/x01/${id}`, { ...sent, updatedAt: new Date(2030, 0, 1).toISOString() });
        expect(again.status).toBe(200);
        expect((await db.x01.findById(id).lean()).updatedAt.getTime()).toBe(finished.updatedAt.getTime());
        expect(new Date((await db.clubTally.findOne({ club: state.clubA._id, sourceId: id }).lean()).at).getTime()).toBe(finished.updatedAt.getTime());
    });

    it('keeps the first finish in the club tally when the game was updated since', async () => {
        const { saveTally } = await import('../../src/utils/club.badge.service.js');
        const ids = [String(new db.mongoose.Types.ObjectId()), String(new db.mongoose.Types.ObjectId())];
        const game = { _id: new db.mongoose.Types.ObjectId(), ...storedOf('x01', { ...X01, players: ids, visits: winningVisits(...ids), currentPlayerTurn: ids[0] }) };
        const first = new Date(2026, 9, 1, 20, 0);
        expect(await saveTally(state.clubA._id, 'x01', { ...game, updatedAt: first })).toBe(true);
        expect(await saveTally(state.clubA._id, 'x01', { ...game, updatedAt: new Date(2026, 10, 5, 20, 0) })).toBe(false);
        const tally = await db.clubTally.findOne({ club: state.clubA._id, sourceId: String(game._id) }).lean();
        expect(tally.at.getTime()).toBe(first.getTime());
        expect(tally.gameUpdatedAt.getTime()).toBe(new Date(2026, 10, 5, 20, 0).getTime());
    });
});
