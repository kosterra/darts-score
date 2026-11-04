import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

// the app reads these at import; set them before importing it
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * Boards through the real app and an in-memory MongoDB: a tournament of 8
 * drawn on 2 boards, a game won frees its board and the next match is called
 * to it; a club night on boards, its pairings made, started by a player and
 * called again; only admins run the boards; the public big screen of the
 * boards by its signed link. The rules are in app-ui/src/rules/boards.test.js.
 */

let mongod;
let db;
let app;
const state = {};
const api = () => supertest(app);

const pad = (value) => String(value).padStart(2, '0');
const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    const { hashPassword } = await import('../../src/utils/auth.utils.js');

    const passwordHash = await hashPassword('Passw0rd!');
    const alice = await db.user.create({ email: 'alice@boards.local', firstname: 'Alice', lastname: 'Admin', passwordHash });
    const bob = await db.user.create({ email: 'bob@boards.local', firstname: 'Bob', lastname: 'Member', passwordHash });
    // a club night every day of the week: today is one
    const club = await db.club.create({
        name: 'Board Darts Club', admins: [alice._id],
        calendar: { nights: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, start: '00:00', end: '23:59', note: '' })), cancelled: [] },
    });
    const names = ['Ann', 'Bob', 'Cid', 'Dan', 'Eve', 'Fay', 'Gus', 'Hal'];
    const players = [];
    for (const name of names) {
        players.push(await db.player.create({
            nickname: name, firstname: name, lastname: 'Player', clubs: [club._id], dateOfBirth: new Date('1990-05-15'),
            user: name === 'Ann' ? alice._id : name === 'Bob' ? bob._id : null,
        }));
    }
    const login = async (email) => {
        const res = await api().post('/api/auth/login').send({ email, password: 'Passw0rd!' });
        if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status}`);
        return res.headers['set-cookie'];
    };
    Object.assign(state, {
        club: String(club._id), clubId: club._id,
        players: players.map(player => String(player._id)),
        byName: Object.fromEntries(players.map(player => [player.nickname, String(player._id)])),
        alice: await login('alice@boards.local'),
        bob: await login('bob@boards.local'),
    });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

const as = (cookie) => {
    const attach = (req) => req.set('Cookie', cookie).set('X-Club-Id', state.club);
    return {
        get: (path) => attach(api().get(path)),
        post: (path, body) => attach(api().post(path)).send(body ?? {}),
        put: (path, body) => attach(api().put(path)).send(body ?? {}),
    };
};
const admin = () => as(state.alice);
const member = () => as(state.bob);

// the first player throws a nine-darter, the second 20s: a leg of 501 won
const winFirst = async (kind, gameId) => {
    const game = (await admin().get(`/api/games/${kind}/${gameId}`)).body;
    const [a, b] = game.players;
    const visits = [
        { player: a, darts: ['T20', 'T20', 'T20'] }, { player: b, darts: ['S20', 'S20', 'S20'] },
        { player: a, darts: ['T20', 'T20', 'T20'] }, { player: b, darts: ['S20', 'S20', 'S20'] },
        { player: a, darts: ['T20', 'T19', 'D12'] },
    ];
    // what the app keeps of a game: its settings and visits (the rest is worked out from them)
    const settings = ['startingScore', 'legInMode', 'legOutMode', 'setMode', 'legMode', 'numberOfSets', 'numberOfLegs', 'isSoloGame', 'numberOfPlayers', 'players', 'startingPlayerSet', 'startingPlayerLeg'];
    const res = await admin().put(`/api/games/${kind}/${gameId}`, { ...Object.fromEntries(settings.map(key => [key, game[key]])), visits });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.hasWinner).toBe(true);
    return a;
};

const onBoard = (view, number) => view.boardView.boards.find(board => board.number === number);

describe('a tournament on boards', () => {
    it('is drawn with 8 players on 2 boards: two matches called, the others in the queue, the players told once', async () => {
        const rules = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1 };
        const tournament = await db.tournament.create({
            club: state.clubId, name: 'Board Cup', status: 'closed', closesAt: new Date(Date.now() - 1000), maxPlayers: 8,
            rounds: [8, 4, 2].map(size => ({ size, date: new Date(), rules })),
            entries: state.players.map(player => ({ player, club: state.clubId, status: 'in' })),
            boards: { count: 2, out: [] },
        });
        state.tournament = String(tournament._id);
        const res = await admin().post(`/api/tournaments/${state.tournament}/draw`, { seeding: 'random' });
        expect(res.status).toBe(200);
        expect(res.body.boards).toEqual({ count: 2, out: [] });
        expect(onBoard(res.body, 1)).toMatchObject({ key: '8-0', status: 'called' });
        expect(onBoard(res.body, 2)).toMatchObject({ key: '8-1', status: 'called' });
        expect(res.body.boardView.queue).toEqual(['8-2', '8-3']);
        expect(res.body.matches.find(match => match.id === '8-0')).toMatchObject({ board: 1, held: false, calledAt: expect.any(String), readyAt: expect.any(String) });
        // the chances of the strength rating are still on the open matches
        expect(res.body.matches.find(match => match.id === '8-0').chances).toBeTruthy();
        const onBoards = ['8-0', '8-1'].flatMap(id => res.body.matches.find(match => match.id === id).players);
        const told = await db.notification.find({ kind: 'boardCalled' }).lean();
        const withLogin = [state.byName.Ann, state.byName.Bob].filter(id => onBoards.includes(id)).length;
        expect(told).toHaveLength(withLogin);
        for (const notice of told) expect(notice.title).toMatch(/^Your match: board [12], against \w+$/);
    });

    it('frees the board of a game won at once: the next match is called to it', async () => {
        const start = await admin().post(`/api/tournaments/${state.tournament}/matches/8-0/start`, {});
        expect(start.status).toBe(201);
        const playing = (await admin().get(`/api/tournaments/${state.tournament}`)).body;
        expect(onBoard(playing, 1)).toMatchObject({ key: '8-0', status: 'playing' });
        const winner = await winFirst('x01', start.body.game);
        const after = (await admin().get(`/api/tournaments/${state.tournament}`)).body;
        expect(after.matches.find(match => match.id === '8-0')).toMatchObject({ status: 'done', winner });
        expect(onBoard(after, 1)).toMatchObject({ key: '8-2', status: 'called' });
        expect(after.boardView.queue).toEqual(['8-3']);
        // no "Your next match" on top of the board's notice
        expect(await db.notification.countDocuments({ kind: 'tournamentMatch' })).toBe(0);
    });

    it('lets admins move, hold back and set the boards; members get 403', async () => {
        const base = `/api/tournaments/${state.tournament}`;
        expect((await member().put(`${base}/boards`, { count: 3 })).status).toBe(403);
        expect((await member().put(`${base}/matches/8-3/board`, { board: 1 })).status).toBe(403);
        expect((await member().put(`${base}/matches/8-3/held`, { held: true })).status).toBe(403);

        const three = await admin().put(`${base}/boards`, { count: 3 });
        expect(three.status).toBe(200);
        expect(onBoard(three.body, 3)).toMatchObject({ key: '8-3', status: 'called' });
        const swapped = await admin().put(`${base}/matches/8-3/board`, { board: 1 });
        expect(swapped.status).toBe(200);
        expect(onBoard(swapped.body, 1).key).toBe('8-3');
        expect(onBoard(swapped.body, 3).key).toBe('8-2');
        const held = await admin().put(`${base}/matches/8-2/held`, { held: true });
        expect(held.body.boardView.held).toEqual(['8-2']);
        expect(onBoard(held.body, 3).status).toBe('free');
        expect((await admin().put(`${base}/matches/8-2/held`, { held: false })).body.boardView.held).toEqual([]);
        // refused: a board not played on, a match not ready, nonsense
        expect((await admin().put(`${base}/matches/8-2/board`, { board: 5 })).status).toBe(409);
        expect((await admin().put(`${base}/matches/2-0/board`, { board: 2 })).status).toBe(409);
        expect((await admin().put(`${base}/boards`, { count: 17 })).status).toBe(422);
        expect((await admin().put(`${base}/matches/8-2/held`, { held: 'yes' })).status).toBe(422);
    });

    it('shows the boards on a big screen by a signed link, without a login', async () => {
        const link = await member().post(`/api/tournaments/${state.tournament}/boards/screen`);
        expect(link.status).toBe(200);
        const screen = await api().get(`/api/screen/${link.body.token}`);
        expect(screen.status).toBe(200);
        expect(screen.body).toMatchObject({ kind: 'tournamentBoards', title: 'Board Cup', club: { name: 'Board Darts Club' } });
        expect(screen.body.boards).toHaveLength(3);
        expect(screen.body.boards[0]).toMatchObject({ number: 1, status: 'called', round: 'Quarter-finals' });
        expect(screen.body.boards[0].players.map(player => Object.keys(player).sort())).toEqual([['country', 'id', 'nickname'], ['country', 'id', 'nickname']]);
        // a link changed by hand is not one
        const [payload, signature] = link.body.token.split('.');
        expect((await api().get(`/api/screen/${payload}.${signature.slice(1)}x`)).status).toBe(404);
    });
});

describe('a club night on boards', () => {
    it('is set up by an admin only: the pairings are made and called to the boards', async () => {
        const day = today();
        const four = ['Ann', 'Bob', 'Cid', 'Dan'].map(name => state.byName[name]);
        expect((await member().put(`/api/calendar/nights/${day}/boards`, { count: 2, players: four })).status).toBe(403);
        expect((await member().get(`/api/calendar/nights/${day}/boards`)).body).toBeNull();
        const res = await admin().put(`/api/calendar/nights/${day}/boards`, { count: 2, players: four, setup: { kind: 'x01', startingScore: 501, numberOfLegs: 1 } });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ day, boards: { count: 2, out: [] }, setup: { kind: 'x01', numberOfLegs: 1 }, canRun: true });
        expect(res.body.players.map(player => player.nickname)).toEqual(['Ann', 'Bob', 'Cid', 'Dan']);
        expect(res.body.entries.filter(entry => entry.status === 'called')).toHaveLength(2);
        const playing = res.body.entries.flatMap(entry => entry.players);
        expect(new Set(playing).size).toBe(4);
        expect((await admin().put(`/api/calendar/nights/${day}/boards`, { setup: { numberOfLegs: 4 } })).status).toBe(422);
    });

    it('lets a player of a pairing start its game, others not; the game won frees the board for the next pairing', async () => {
        const day = today();
        const night = (await member().get(`/api/calendar/nights/${day}/boards`)).body;
        expect(night.canRun).toBe(false);
        const mine = night.entries.find(entry => entry.players.includes(state.byName.Bob));
        const other = night.entries.find(entry => entry !== mine);
        expect((await member().post(`/api/calendar/nights/${day}/boards/entries/${other.id}/start`)).status).toBe(403);
        expect((await member().put(`/api/calendar/nights/${day}/boards/entries/${mine.id}`, { held: true })).status).toBe(403);

        // Bob sees his board
        const boards = await api().get('/api/boards/mine').set('Cookie', state.bob);
        expect(boards.status).toBe(200);
        expect(boards.body).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'night', id: day, key: mine.id, board: mine.board, status: 'called', link: `/club-night/${day}`, club: { id: state.club, name: 'Board Darts Club' } })]));

        const start = await member().post(`/api/calendar/nights/${day}/boards/entries/${mine.id}/start`, { first: mine.players[1] });
        expect(start.status).toBe(201);
        expect(start.body.game.kind).toBe('x01');
        const again = await member().post(`/api/calendar/nights/${day}/boards/entries/${mine.id}/start`);
        expect(again.status).toBe(200);
        expect(again.body.game.id).toBe(start.body.game.id);

        const winner = await winFirst('x01', start.body.game.id);
        expect(winner).toBe(mine.players[1]);
        const after = (await member().get(`/api/calendar/nights/${day}/boards`)).body;
        expect(after.entries.find(entry => entry.id === mine.id)).toMatchObject({ status: 'done', winner });
        // the board is called again at once, with a pairing of the two who are free
        const next = after.boardView.boards.find(board => board.number === mine.board);
        expect(next.status).toBe('called');
        expect(after.entries.find(entry => entry.id === next.key).players.sort()).toEqual([...mine.players].sort());
    });

    it('shows the boards of the night on a big screen; the club keeps its number of boards', async () => {
        const day = today();
        const link = await member().post(`/api/calendar/nights/${day}/boards/screen`);
        expect(link.status).toBe(200);
        const screen = await api().get(`/api/screen/${link.body.token}`);
        expect(screen.body).toMatchObject({ kind: 'nightBoards', title: 'Club night' });
        expect(screen.body.boards.map(board => board.status)).toEqual(['called', 'called']);

        expect((await member().put('/api/calendar/boards', { count: 4 })).status).toBe(403);
        expect((await admin().put('/api/calendar/boards', { count: 4 })).body).toEqual({ boards: 4 });
        expect((await admin().get('/api/calendar')).body.boards).toBe(4);
    });
});
