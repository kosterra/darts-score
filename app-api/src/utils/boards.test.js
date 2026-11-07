import { beforeEach, describe, expect, it, vi } from 'vitest';

// the club's players, the nights on boards, the games and what was told, in memory
let players = [];
let nights = [];
let answers = [];
const games = [];
const notices = [];
const lean = (value) => ({ lean: async () => value });
const ids = (query) => (query?.$in ?? []).map(String);

// a night as mongoose gives it, enough for the service
function BoardNight(fields) {
    Object.assign(this, { boards: { count: 2, out: [] }, players: [], entries: [], ...fields });
    this._id = this._id ?? `night${nights.length + 1}`;
    this.save = vi.fn(async () => {
        if (!nights.includes(this)) nights.push(this);
        return this;
    });
}

vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        mongoose: { isValidObjectId: (id) => /^[0-9a-f]{24}$/.test(String(id)) },
        player: {
            find: (query) => lean(players.filter(player => ids(query._id).includes(player._id) && (!query.clubs || player.clubs.includes(query.clubs)))),
        },
        attendance: { find: () => lean(answers) },
        get boardNight() {
            return Object.assign(BoardNight, {
                findOne: async (query) => nights.find(night => (query['entries.game.id']
                    ? night.entries.some(entry => String(entry.game?.id) === String(query['entries.game.id']))
                    : night.club === query.club && night.day === query.day)) ?? null,
            });
        },
        x01: {
            create: async (doc) => { const game = { ...doc, _id: `game${games.length + 1}` }; games.push(game); return game; },
            exists: async (query) => games.some(game => game._id === String(query._id)),
        },
        cricket: { create: async (doc) => { const game = { ...doc, _id: `game${games.length + 1}` }; games.push(game); return game; } },
        elimination: {},
    },
}));
vi.mock('./notify.js', () => ({ deliverQuietly: async (list) => { notices.push(...list); return list; } }));

const service = await import('./boards.js');

const id = (n) => n.toString(16).padStart(24, '0');
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
// a club with a club night every day
const club = {
    _id: 'club', boards: 2, gameRules: undefined,
    calendar: { nights: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, start: '19:00', end: '23:00' })), cancelled: [] },
};
const called = () => notices.filter(notice => notice.kind === 'boardCalled');
const onBoard = (night, board) => night.entries.find(entry => entry.board === board && ['called', 'playing'].includes(entry.status));
const won = (entry, winner) => ({ playerModels: Object.fromEntries(entry.players.map(player => [player, { hasWonGame: player === winner }])) });

beforeEach(() => {
    players = [1, 2, 3, 4, 5, 6].map(n => ({ _id: id(n), nickname: `P${n}`, clubs: ['club'], user: n <= 4 ? `user${n}` : null }));
    nights = [];
    answers = [1, 2, 3, 4].map(n => ({ player: id(n) }));
    games.length = 0;
    notices.length = 0;
});

describe('setting up a night on boards', () => {
    it('starts with the club\'s boards and those who said they come: the pairings called, the players told', async () => {
        const night = await service.saveNight(club, today, {});
        expect(night.boards).toEqual({ count: 2, out: [] });
        expect(night.players).toEqual([id(1), id(2), id(3), id(4)]);
        expect(night.setup).toEqual(service.NIGHT_SETUP);
        expect(onBoard(night, 1).players).toEqual([id(1), id(2)]);
        expect(onBoard(night, 2).players).toEqual([id(3), id(4)]);
        expect(called()).toHaveLength(4);
        expect(called()[0]).toMatchObject({ user: 'user1', club: 'club', link: `/club-night/${today}`, title: 'Your match: board 1, against P2', body: 'Club night' });
    });

    it('keeps as many pairings waiting as boards, and takes a player out of the pairings not started', async () => {
        const night = await service.saveNight(club, today, { players: [1, 2, 3, 4, 5, 6].map(id) });
        expect(night.entries.filter(entry => entry.status === 'queued')).toHaveLength(1);
        const waiting = night.entries.find(entry => entry.status === 'queued');
        expect(waiting.players).toEqual([id(5), id(6)]);
        await service.saveNight(club, today, { players: [1, 2, 3, 4, 5].map(id) });
        expect(night.entries.find(entry => entry.id === waiting.id)).toMatchObject({ status: 'cancelled', board: null });
    });

    it('pairs nobody who went home, keeps when they went and brings them back', async () => {
        const night = await service.saveNight(club, today, { players: [1, 2, 3, 4, 5, 6].map(id) });
        const waiting = night.entries.find(entry => entry.status === 'queued');
        await service.saveNight(club, today, { gone: [id(6)] });
        expect(night.entries.find(entry => entry.id === waiting.id)).toMatchObject({ status: 'cancelled', board: null });
        // still a player of the night (their games count), but not paired again
        expect(night.players).toContain(id(6));
        expect(night.entries.filter(entry => entry.status === 'queued').flatMap(entry => entry.players)).not.toContain(id(6));
        const at = night.left[0].at;
        expect(night.left).toEqual([{ id: id(6), at }]);
        await service.saveNight(club, today, { gone: [id(6), id(5)] });
        expect(night.left.find(entry => entry.id === id(6)).at).toBe(at);
        // back again, and someone taken out of the night is not kept as gone home
        await service.saveNight(club, today, { gone: [id(5)] });
        expect(night.left.map(entry => entry.id)).toEqual([id(5)]);
        await service.saveNight(club, today, { players: [1, 2, 3, 4, 6].map(id) });
        expect(night.left).toEqual([]);
        expect((await service.nightView(night)).left).toEqual([]);
    });

    it('takes only the known settings of the game, and refuses a day without a club night', async () => {
        const night = await service.saveNight(club, today, { setup: { kind: 'cricket', variant: 'Cut-throat', numberOfLegs: 7, colour: 'red' } });
        expect(night.setup).toEqual({ ...service.NIGHT_SETUP, kind: 'cricket', variant: 'Cut-throat' });
        await expect(service.saveNight({ ...club, calendar: { nights: [] } }, today, {})).rejects.toMatchObject({ status: 404 });
        await expect(service.saveNight({ ...club, calendar: { ...club.calendar, cancelled: [{ day: today }] } }, today, {})).rejects.toMatchObject({ status: 409 });
        await expect(service.saveNight(club, '2020-01-01', {})).rejects.toMatchObject({ status: 409 });
    });
});

describe('the pairings', () => {
    it('start their game: a player of it or an admin, the one chosen throwing first', async () => {
        const night = await service.saveNight(club, today, {});
        const entry = onBoard(night, 1);
        await expect(service.startEntry(club, night, entry.id, { playerId: id(3) })).rejects.toMatchObject({ status: 403 });
        const { game, created } = await service.startEntry(club, night, entry.id, { playerId: id(2), first: id(2) });
        expect(created).toBe(true);
        expect(games[0]).toMatchObject({ club: 'club', friendly: false, players: [id(2), id(1)], startingScore: 501, numberOfLegs: 3, legOutMode: 'Double Out' });
        expect(night.entries.find(item => item.id === entry.id)).toMatchObject({ status: 'playing', game: { kind: 'x01', id: game.id } });
        // starting again answers with the same game
        expect((await service.startEntry(club, night, entry.id, { isAdmin: true })).game.id).toBe(game.id);
    });

    it('free their board as soon as the game is won: the next pairing is called to it', async () => {
        const night = await service.saveNight(club, today, { players: [1, 2, 3, 4, 5, 6].map(id) });
        const entry = onBoard(night, 1);
        const { game } = await service.startEntry(club, night, entry.id, { isAdmin: true });
        notices.length = 0;
        await service.boardGameFinished({ _id: game.id }, won(entry, id(1)));
        expect(night.entries.find(item => item.id === entry.id)).toMatchObject({ status: 'done', winner: id(1) });
        expect(onBoard(night, 1).players).toEqual([id(5), id(6)]);
        expect(called().map(notice => notice.title)).toEqual([]);
        // P5 and P6 have no login; the queue is topped up with the two who are free again
        expect(night.entries.filter(item => item.status === 'queued').map(item => item.players)).toEqual([[id(1), id(2)]]);
    });

    it('read the night again when another game was saved at the same moment', async () => {
        const night = await service.saveNight(club, today, {});
        const entry = onBoard(night, 1);
        const { game } = await service.startEntry(club, night, entry.id, { isAdmin: true });
        // the first read is out of date by the time it is saved
        const stale = new BoardNight({ ...night, entries: night.entries.map(item => ({ ...item, players: [...item.players] })) });
        stale.save.mockImplementation(async () => {
            nights.splice(nights.indexOf(stale), 1);
            throw Object.assign(new Error('No matching document'), { name: 'VersionError' });
        });
        nights.unshift(stale);
        await service.boardGameFinished({ _id: game.id }, won(entry, id(2)));
        expect(stale.save).toHaveBeenCalledTimes(1);
        expect(night.entries.find(item => item.id === entry.id)).toMatchObject({ status: 'done', winner: id(2) });
    });

    it('stay on their board, called again, when their game is deleted', async () => {
        const night = await service.saveNight(club, today, {});
        const entry = onBoard(night, 2);
        const { game } = await service.startEntry(club, night, entry.id, { isAdmin: true });
        await service.boardGameDeleted({ _id: game.id });
        expect(night.entries.find(item => item.id === entry.id)).toMatchObject({ status: 'called', board: 2, game: { id: null } });
    });

    it('are moved, held back and cancelled by an admin; a move sends no notice', async () => {
        const night = await service.saveNight(club, today, { count: 3, players: [1, 2, 3, 4, 5, 6].map(id) });
        const first = onBoard(night, 1);
        notices.length = 0;
        await service.changeEntry(night, first.id, { board: 3 });
        expect(onBoard(night, 1).players).toEqual([id(5), id(6)]);
        expect(onBoard(night, 3).id).toBe(first.id);
        expect(called()).toHaveLength(0);
        await service.changeEntry(night, first.id, { held: true });
        expect(night.entries.find(item => item.id === first.id)).toMatchObject({ held: true, board: null, status: 'queued' });
        await service.changeEntry(night, first.id, { status: 'cancelled' });
        expect(night.entries.find(item => item.id === first.id).status).toBe('cancelled');
        await expect(service.changeEntry(night, first.id, { held: false })).rejects.toMatchObject({ status: 409 });
        await expect(service.changeEntry(night, 'nope', { held: false })).rejects.toMatchObject({ status: 404 });
    });
});

describe('the view of a night', () => {
    it('has the players there, every pairing and the boards with the queue', async () => {
        const night = await service.saveNight(club, today, { players: [1, 2, 3, 4, 5, 6].map(id) });
        const view = await service.nightView(night, { playerId: id(1), isAdmin: true });
        expect(view.players.map(player => player.nickname)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
        expect(view.boardView.boards.map(board => board.status)).toEqual(['called', 'called']);
        expect(view.boardView.queue).toHaveLength(1);
        expect(view).toMatchObject({ day: today, myPlayer: id(1), canRun: true });
        expect(await service.nightView(null)).toBeNull();
    });
});
