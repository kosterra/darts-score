import { describe, expect, it, vi, beforeEach } from 'vitest';

// the club, its members, the games and what was told, in memory
let players = [];
let games = [];
const notices = [];
const lean = (value) => ({ lean: async () => value });
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        mongoose: { isValidObjectId: (id) => /^[0-9a-f]{24}$/.test(String(id)) },
        player: {
            find: (query) => lean(players.filter(player => query._id.$in.map(String).includes(String(player._id)))),
            countDocuments: async (query) => players.filter(player => query._id.$in.map(String).includes(String(player._id))).length,
        },
        club: { findById: () => lean({ _id: 'club', admins: ['admin1'] }) },
        x01: {
            create: async (doc) => { const game = { ...doc, _id: `game${games.length + 1}` }; games.push(game); return game; },
            findById: async (id) => games.find(game => game._id === String(id)) ?? null,
            updateOne: async () => ({}),
        },
    },
}));
vi.mock('./notify.js', () => ({ deliverQuietly: async (list) => { notices.push(...list); return list; } }));

const service = await import('./leagues.js');
const { roundsOfPreset } = await import('../rules/tournaments.js');

const id = (n) => n.toString(16).padStart(24, '0');
const rules = roundsOfPreset('clubNight', 8)[0].rules;
const leagueDoc = (fields = {}) => {
    const doc = { _id: id(800), club: 'club', name: 'Winter League', status: 'draft', players: [1, 2, 3, 4].map(id), meetings: 1, everyDays: 7, firstDay: new Date(2026, 10, 3, 19, 30), rules, matches: [], matchdays: [], reminded: [], ...fields };
    doc.save = vi.fn(async () => doc);
    return doc;
};

beforeEach(() => {
    players = [1, 2, 3, 4, 5].map(n => ({ _id: id(n), nickname: `P${n}`, user: id(100 + n) }));
    games = [];
    notices.length = 0;
});

describe('leagues', () => {
    it('checks the setup, with players of the club only', async () => {
        const body = { name: 'Winter League', players: [1, 2, 3].map(id), meetings: 2, everyDays: 7, firstDay: new Date(2026, 10, 3), rules };
        const { setup } = await service.checkSetup(body, 'club');
        expect(setup).toMatchObject({ name: 'Winter League', meetings: 2, everyDays: 7 });
        expect((await service.checkSetup({ ...body, players: [id(1), id(2), id(99)] }, 'club')).error).toMatch(/players of the club/);
        expect((await service.checkSetup({ ...body, players: [id(1), id(2)] }, 'club')).error).toMatch(/at least 3/);
        // once it runs only the name and description change
        const running = leagueDoc({ status: 'running' });
        expect((await service.checkSetup({ name: 'New', players: [] }, 'club', running)).setup).toEqual({ name: 'New', description: '' });
    });

    it('starts the season in matchdays a week apart and tells every player', async () => {
        const league = leagueDoc({ meetings: 2 });
        await service.startLeague(league);
        expect(league.status).toBe('running');
        expect(league.matches).toHaveLength(12);
        expect(league.matchdays).toHaveLength(6);
        expect(league.matchdays[1].date.getDate()).toBe(10);
        expect(notices.filter(notice => notice.kind === 'leagueStarted')).toHaveLength(4);
        expect(notices[0].body).toMatch(/^Your first match: against P\d, matchday 1$/);
        await expect(service.startLeague(league)).rejects.toMatchObject({ status: 409 });
    });

    it('plays a match as a game with the league rules, counts it, and ends the season with its winner', async () => {
        const league = leagueDoc();
        await service.startLeague(league);
        const db = (await import('../models/db.model.js')).default;
        db.league = { findById: async () => league };
        const first = league.matches[0];
        const game = await service.startMatch(league, first.id, { first: first.players[1] });
        expect(game).toMatchObject({ league: { id: id(800), match: first.id }, players: [first.players[1], first.players[0]], numberOfLegs: rules.numberOfLegs });
        const [a, b] = first.players;
        await service.leagueGameFinished(game, { playerModels: { [a]: { hasWonGame: true, legsWon: { game: 2 } }, [b]: { hasWonGame: false, legsWon: { game: 1 } } } });
        expect(league.matches.find(match => match.id === first.id)).toMatchObject({ status: 'done', winner: a, score: { legs: [2, 1] } });

        // the rest decided by the admin: P1 wins all of theirs, else the first named
        for (const match of league.matches.filter(entry => entry.status === 'ready')) {
            await service.setResult(league, match.id, match.players.includes(id(1)) ? id(1) : match.players[0], { by: 'admin1' });
        }
        expect(league.status).toBe('finished');
        const { leagueTable } = await import('../rules/leagues.js');
        expect(league.winner).toBe(leagueTable(league.players, league.matches)[0].player);
        expect(notices.some(notice => notice.kind === 'leagueWon')).toBe(true);
    });

    it('moves a matchday and a single match, and tells their players', async () => {
        const league = leagueDoc();
        await service.startLeague(league);
        notices.length = 0;
        await service.moveMatchday(league, 2, new Date(2026, 10, 12, 19, 30));
        expect(league.matchdays.find(day => day.day === 2).date.getDate()).toBe(12);
        expect(notices.filter(notice => notice.kind === 'leagueMoved')).toHaveLength(4);
        expect(notices[0].body).toBe('Now due on 12.11.2026');
        notices.length = 0;
        const match = league.matches.find(entry => entry.day === 3);
        await service.moveMatch(league, match.id, new Date(2026, 11, 1));
        expect(league.matches.find(entry => entry.id === match.id).date.getMonth()).toBe(11);
        expect(notices).toHaveLength(2);
        await expect(service.moveMatchday(league, 99, new Date())).rejects.toMatchObject({ status: 404 });
    });

    it('tells the admins once of a matchday over with matches not played', async () => {
        const league = leagueDoc();
        await service.startLeague(league);
        const db = (await import('../models/db.model.js')).default;
        db.league = { find: async () => [league] };
        notices.length = 0;
        await service.runLeagueJobs(new Date(2026, 10, 5));
        expect(notices.filter(notice => notice.kind === 'leagueOverdue')).toHaveLength(1);
        expect(notices[0].title).toMatch(/2 matches of matchday 1 not played/);
        await service.runLeagueJobs(new Date(2026, 10, 6));
        expect(notices).toHaveLength(1);
    });
});
