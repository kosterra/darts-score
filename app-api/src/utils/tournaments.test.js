import { describe, expect, it, vi, beforeEach } from 'vitest';

// the club, its members and accounts, the games and what was told, in memory
let players = [];
let users = [];
let contacts = [];
let tallies = [];
let games = [];
const notices = [];
const mails = [];
const created = [];
const badgesSynced = [];
const lean = (value) => ({ lean: async () => value });
const byIds = (list, ids) => list.filter(item => ids.map(String).includes(String(item._id)));
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        mongoose: { isValidObjectId: (id) => /^[0-9a-f]{24}$/.test(String(id)) },
        player: {
            find: (query) => lean(query._id ? byIds(players, query._id.$in) : players.filter(player => !player.guest)),
            countDocuments: async () => players.filter(player => !player.guest).length,
            exists: async ({ _id }) => players.some(player => String(player._id) === String(_id)),
            findById: async () => null,
        },
        user: { find: (query) => lean(byIds(users, query._id.$in)) },
        playerContact: { find: () => lean(contacts) },
        notification: { create: async (doc) => { notices.push(doc); return doc; } },
        club: { findById: () => lean({ _id: 'club', name: 'Red Lion', admins: ['admin1'] }) },
        clubTally: { find: () => lean(tallies) },
        x01: {
            create: async (doc) => { const game = { ...doc, _id: `game${games.length + 1}` }; games.push(game); created.push(game); return game; },
            findById: async (id) => games.find(game => game._id === String(id)) ?? null,
            updateOne: async () => ({}),
        },
    },
}));
vi.mock('./notify.js', () => ({
    dateIn: (language, date) => new Date(date).toISOString().slice(0, 10),
    languageOf: (user) => user?.language ?? 'en',
    unsubscribeToken: () => 'unsub',
    deliverQuietly: async (list) => { notices.push(...list); return list; },
}));
vi.mock('./mail.service.js', () => ({ sendTemplateMail: async (id, to, vars, language) => { mails.push({ id, to, vars, language }); } }));
vi.mock('./mail.utils.js', () => ({ getAppUrl: () => 'https://oche.example.com', isMailConfigured: () => true }));
vi.mock('./badge.service.js', () => ({ syncPlayerBadges: async (player) => { badgesSynced.push(String(player._id)); } }));
vi.mock('./auth.utils.js', () => ({ getSessionSecret: () => 'secret' }));

const service = await import('./tournaments.js');
const { roundsOfPreset } = await import('../rules/tournaments.js');

const id = (n) => n.toString(16).padStart(24, '0');
const now = new Date(2026, 9, 24, 12, 0);
const later = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

// a tournament as mongoose gives it, enough for the service
const tournamentDoc = (fields = {}) => {
    const doc = {
        _id: id(900), club: 'club', name: 'Autumn Cup', status: 'draft', maxPlayers: 16, closesAt: later(7),
        rounds: roundsOfPreset('clubClassic', 16).map((round, index) => ({ ...round, date: later(10 + index * 7) })),
        entries: [], matches: [], reminded: [], draw: {},
        ...fields,
    };
    doc.save = vi.fn(async () => doc);
    return doc;
};

beforeEach(() => {
    players = [1, 2, 3, 4, 5].map(n => ({ _id: id(n), nickname: `P${n}`, firstname: `First${n}`, user: n <= 3 ? id(100 + n) : null }));
    users = [1, 2, 3].map(n => ({ _id: id(100 + n), email: `p${n}@example.ch`, firstname: `First${n}`, language: n === 2 ? 'de' : 'en', notifications: n === 3 ? { tournamentInvites: { inApp: true, mail: 'off' } } : undefined }));
    contacts = [{ _id: 'contact4', player: id(4), email: 'p4@example.ch', language: 'fr', topics: ['tournamentInvites'] }];
    tallies = [];
    games = [];
    for (const list of [notices, mails, created, badgesSynced]) list.length = 0;
});

describe('setting up a tournament', () => {
    it('checks the name, the bracket and the rules of every round', () => {
        const rounds = roundsOfPreset('clubNight', 8);
        expect(service.checkSetup({ name: '', closesAt: later(3), maxPlayers: 8, rounds }).error).toMatch(/name/);
        expect(service.checkSetup({ name: 'Cup', closesAt: later(3), maxPlayers: 12, rounds }).error).toMatch(/at most/);
        expect(service.checkSetup({ name: 'Cup', closesAt: later(3), maxPlayers: 8, rounds: rounds.slice(1) }).error).toMatch(/Every round/);
        const even = rounds.map(round => (round.size === 2 ? { ...round, rules: { ...round.rules, numberOfLegs: 6 } } : round));
        expect(service.checkSetup({ name: 'Cup', closesAt: later(3), maxPlayers: 8, rounds: even }).error).toMatch(/even number/);
        expect(service.checkSetup({ name: 'Cup', closesAt: later(3), maxPlayers: 8, rounds, invite: 'pigeon' }).error).toMatch(/invited/);
        const { setup } = service.checkSetup({ name: ' Cup ', closesAt: later(3), maxPlayers: 8, rounds, preset: 'clubNight' });
        expect(setup).toMatchObject({ name: 'Cup', maxPlayers: 8, preset: 'clubNight', invite: 'mail' });
        expect(service.checkSetup({ name: 'Cup', closesAt: later(3), maxPlayers: 8, rounds, invite: 'banner' }).setup.invite).toBe('banner');
        expect(setup.rounds.map(round => round.size)).toEqual([8, 4, 2]);
    });

    it('wants every round on a day of its own after the registration', () => {
        const rounds = (days) => roundsOfPreset('clubNight', 8).map((round, index) => ({ ...round, date: days[index] === null ? null : later(days[index]) }));
        expect(service.scheduleError({ closesAt: later(-1), rounds: rounds([5, 6, 7]) }, now)).toMatch(/future/);
        expect(service.scheduleError({ closesAt: later(3), rounds: rounds([5, null, 7]) }, now)).toMatch(/day of every round/);
        expect(service.scheduleError({ closesAt: later(3), rounds: rounds([2, 6, 7]) }, now)).toMatch(/after the registration/);
        expect(service.scheduleError({ closesAt: later(3), rounds: rounds([5, 5, 7]) }, now)).toMatch(/day of its own/);
        expect(service.scheduleError({ closesAt: later(3), rounds: rounds([5, 6, 7]) }, now)).toBeNull();
    });
});

describe('the registration', () => {
    it('invites every member: in the app and by mail as they chose, by mail to a player without a login whose club keeps an address', async () => {
        const tournament = tournamentDoc();
        await service.openRegistration(tournament);
        expect(tournament.status).toBe('registration');
        expect(tournament.entries.map(entry => entry.status)).toEqual(['invited', 'invited', 'invited', 'invited', 'invited']);
        expect(mails.map(mail => [mail.to, mail.language])).toEqual([['p1@example.ch', 'en'], ['p2@example.ch', 'de'], ['p4@example.ch', 'fr']]);
        expect(mails[0].vars.link).toContain('/tournament-reply?token=');
        expect(mails[0].vars.link).toMatch(/answer=in$/);
        expect(mails[0].vars.declineLink).toMatch(/answer=out$/);
        expect(mails[0].vars.schedule.split('\n')).toHaveLength(4);
        expect(notices.filter(notice => notice.kind === 'tournamentInvite')).toHaveLength(3);
    });

    it('invites only in the app, or not at all (the banner), as the admins chose', async () => {
        const inApp = tournamentDoc({ invite: 'notification' });
        await service.openRegistration(inApp);
        expect(mails).toEqual([]);
        expect(notices.filter(notice => notice.kind === 'tournamentInvite')).toHaveLength(3);
        notices.length = 0;
        const banner = tournamentDoc({ invite: 'banner' });
        await service.openRegistration(banner);
        expect(banner.status).toBe('registration');
        expect(banner.entries).toHaveLength(5);
        expect(mails).toEqual([]);
        expect(notices).toEqual([]);
        // the reminder follows the same choice
        await service.invite(banner, banner.entries, 'reminder');
        expect(mails).toEqual([]);
    });

    it('takes the answers until it is full, and only while it is open', async () => {
        const tournament = tournamentDoc({ status: 'registration', maxPlayers: 8 });
        tournament.entries = players.map(player => ({ player: player._id, status: 'invited' }));
        await service.answerEntry(tournament, id(1), 'in');
        await service.answerEntry(tournament, id(2), 'out');
        expect(service.entriesIn(tournament)).toHaveLength(1);
        // an admin adds a member who joined later
        players.push({ _id: id(6), nickname: 'P6', user: null });
        await service.answerEntry(tournament, id(6), 'in', { byAdmin: true });
        expect(service.entriesIn(tournament)).toHaveLength(2);
        tournament.maxPlayers = 2;
        await expect(service.answerEntry(tournament, id(3), 'in')).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/full/) });
        tournament.status = 'closed';
        await expect(service.answerEntry(tournament, id(3), 'out')).rejects.toMatchObject({ status: 409 });
        await expect(service.answerEntry(tournament, id(3), 'out', { byAdmin: true })).resolves.toBeTruthy();
    });

    it('answers with one-click links that cannot be forged', () => {
        const token = service.replyToken(id(900), id(4));
        expect(service.readReplyToken(token)).toEqual({ tournament: id(900), player: id(4) });
        const [payload] = token.split('.');
        expect(service.readReplyToken(`${payload}.forged`)).toBeNull();
        expect(service.readReplyToken('nonsense')).toBeNull();
    });

    it('closes at its end and tells the admins, also when too few entered', async () => {
        const tournament = tournamentDoc({ status: 'registration' });
        tournament.entries = players.slice(0, 3).map(player => ({ player: player._id, status: 'in' }));
        await service.closeRegistration(tournament);
        expect(tournament.status).toBe('closed');
        expect(notices.at(-1)).toMatchObject({ user: 'admin1', kind: 'tournamentClosed', title: 'Too few players for Autumn Cup: 3 of 4' });
    });
});

describe('the draw and the matches', () => {
    const closedWithFive = () => {
        const tournament = tournamentDoc({ status: 'closed' });
        tournament.entries = players.map(player => ({ player: player._id, status: 'in' }));
        return tournament;
    };

    it('builds the bracket seeded by the club rating, gives the byes to the first seeds and leaves out the rounds too big', async () => {
        // P5 beat everyone: the first seed
        tallies = [1, 2, 3, 4].map(n => ({ at: later(-n), players: [id(5), id(n)], winners: [id(5)] }));
        const tournament = closedWithFive();
        await service.holdDraw(tournament, { seeding: 'seeded', by: 'admin1', random: () => 0.5 });
        expect(tournament.status).toBe('drawn');
        expect(tournament.draw).toMatchObject({ size: 8, seeding: 'seeded' });
        expect(tournament.rounds.map(round => [round.size, round.skipped])).toEqual([[16, true], [8, false], [4, false], [2, false]]);
        expect(tournament.entries.find(entry => entry.player === id(5)).seed).toBe(1);
        const byes = tournament.matches.filter(match => match.bye);
        expect(byes).toHaveLength(3);
        expect(byes.map(match => match.winner)).toContain(id(5));
        // everyone with a login hears their first match
        expect(notices.filter(notice => notice.kind === 'tournamentDrawn')).toHaveLength(3);
    });

    it('starts a match as an X01 game with the rules of its round, and moves the winner on', async () => {
        const tournament = closedWithFive();
        await service.holdDraw(tournament, { random: () => 0.5 });
        const match = tournament.matches.find(entry => entry.status === 'ready' && entry.size === 8);
        const [a, b] = match.players;
        const game = await service.startMatch(tournament, match.id, { first: b });
        expect(game).toMatchObject({ club: 'club', friendly: false, tournament: { id: id(900), match: match.id }, players: [b, a], numberOfLegs: 7, legMode: 'Best of', startingScore: 501 });
        expect(tournament.status).toBe('running');
        expect(tournament.matches.find(entry => entry.id === match.id)).toMatchObject({ status: 'running', game: game._id });
        // starting again answers with the same game
        expect((await service.startMatch(tournament, match.id))._id).toBe(game._id);
    });

    it('lets the finished game decide the match, a walkover the next, and the final the tournament', async () => {
        const db = (await import('../models/db.model.js')).default;
        const tournament = closedWithFive();
        db.tournament = { findById: async () => tournament };
        await service.holdDraw(tournament, { random: () => 0.5 });
        const first = tournament.matches.find(entry => entry.status === 'ready' && entry.size === 8);
        const game = await service.startMatch(tournament, first.id);
        const [a, b] = first.players;
        await service.tournamentGameFinished(game, { playerModels: { [a]: { hasWonGame: false, legsWon: { game: 1 } }, [b]: { hasWonGame: true, legsWon: { game: 3 } } } });
        const decided = tournament.matches.find(entry => entry.id === first.id);
        expect(decided).toMatchObject({ status: 'done', winner: b, score: { legs: [1, 3] } });
        // both semi-finals are ready now: their players hear it
        expect(tournament.matches.filter(entry => entry.size === 4).every(entry => entry.status === 'ready')).toBe(true);
        expect(notices.some(notice => notice.kind === 'tournamentMatch')).toBe(true);

        for (const semi of tournament.matches.filter(entry => entry.size === 4)) {
            await service.setResult(tournament, semi.id, semi.players[0], { by: 'admin1' });
        }
        const final = tournament.matches.find(entry => entry.size === 2);
        expect(final.status).toBe('ready');
        await service.setResult(tournament, final.id, final.players[1], { by: 'admin1' });
        expect(tournament.status).toBe('finished');
        expect(tournament.winner).toBe(final.players[1]);
        expect(notices.filter(notice => notice.kind === 'tournamentWon').length).toBeGreaterThan(0);
        // a result can no longer change once the next match was decided
        const semi = tournament.matches.find(entry => entry.size === 4);
        await expect(service.setResult(tournament, semi.id, semi.players[1])).rejects.toMatchObject({ status: 409 });
    });

    it('lets a running match start again when its game is deleted', async () => {
        const db = (await import('../models/db.model.js')).default;
        const tournament = closedWithFive();
        db.tournament = { findById: async () => tournament };
        await service.holdDraw(tournament, { random: () => 0.5 });
        const match = tournament.matches.find(entry => entry.status === 'ready');
        const game = await service.startMatch(tournament, match.id);
        await service.tournamentGameDeleted(game);
        expect(tournament.matches.find(entry => entry.id === match.id)).toMatchObject({ status: 'ready', game: null });
    });

    it('refuses a draw with too few players, and a match whose players are not known', async () => {
        const tournament = tournamentDoc({ status: 'closed' });
        tournament.entries = players.slice(0, 3).map(player => ({ player: player._id, status: 'in' }));
        await expect(service.holdDraw(tournament)).rejects.toMatchObject({ status: 409 });
        const full = closedWithFive();
        await service.holdDraw(full, { random: () => 0.5 });
        await expect(service.startMatch(full, '2-0')).rejects.toMatchObject({ status: 409 });
    });
});

describe('the words of a round', () => {
    it('name the rounds and their rules', () => {
        expect([2, 4, 8, 16].map(service.roundName)).toEqual(['Final', 'Semi-finals', 'Quarter-finals', 'Last 16']);
        expect(service.rulesText({ startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 5 })).toBe('Best of 5 legs');
        expect(service.rulesText({ startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 3, legMode: 'Best of', numberOfLegs: 5 })).toBe('First to 3 sets (Best of 5 legs)');
        expect(service.rulesText({ startingScore: 301, legInMode: 'Double In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'First to', numberOfLegs: 3 })).toBe('301 Double In / Double Out, First to 3 legs');
    });
});
