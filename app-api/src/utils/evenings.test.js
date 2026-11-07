import { describe, expect, it, vi, beforeEach } from 'vitest';
import { storedOf } from './game.view.js';

// what making a club creates, in memory
// (noted: the club the evening held as being made when each club was created)
const created = { clubs: [], players: [], games: [], badges: [], deleted: [], noted: [] };
let quickGames = [];
// the evening as the database holds it: its club and the claim of a request making it one
const stored = { club: null, adopting: null, adoptingClub: null };
// clubs a request stopped part-way left behind
let halfClubs = [];
let failBadges = false;
vi.mock('../models/db.model.js', () => {
    const gameModel = (type) => ({
        create: async (doc) => { const game = { ...doc, _id: `${type}-${created.games.length + 1}`, toObject: () => ({ ...doc }) }; created.games.push({ type, doc }); return game; },
        updateOne: async () => ({}),
        deleteOne: async () => ({}),
    });
    return {
        default: {
            club: {
                create: async (doc) => {
                    const club = { ...doc, _id: `club${created.clubs.length + 1}` };
                    created.clubs.push(club);
                    created.noted.push(stored.adoptingClub);
                    return club;
                },
                exists: async () => true,
                findById: async (id) => halfClubs.find(club => club._id === id) ?? null,
            },
            player: {
                create: async (doc) => { const player = { ...doc, _id: `p${created.players.length + 1}` }; created.players.push(player); return player; },
                countDocuments: async (filter) => filter._id.$in.length,
            },
            quickGame: {
                find: () => ({ sort: () => ({ lean: async () => quickGames.filter(game => game.hasWinner && !game.takenOver) }) }),
                // the claim of one game: only once
                updateOne: async (filter, { $set }) => {
                    const game = quickGames.find(entry => entry._id === filter._id);
                    if (!game || ('takenOver' in filter && game.takenOver)) return { modifiedCount: 0 };
                    Object.assign(game, $set);
                    return { modifiedCount: 1 };
                },
                updateMany: async (filter, { $set }) => { for (const game of quickGames) if (game.takenOver) Object.assign(game, $set); return {}; },
            },
            quickEvening: {
                findById: () => ({ lean: async () => ({ ...stored }) }),
                // the claim of the evening: only while it is no club and nobody is making it one
                updateOne: async (filter, { $set }) => {
                    if ('club' in filter && (stored.club || (stored.adopting && stored.adopting >= filter.$or[1].adopting.$lt))) return { modifiedCount: 0 };
                    Object.assign(stored, $set);
                    return { modifiedCount: 1 };
                },
            },
            clubTally: { deleteMany: async () => ({}) },
            x01: gameModel('x01'), cricket: gameModel('cricket'), elimination: gameModel('elimination'),
        },
    };
});
vi.mock('./badge.service.js', () => ({
    syncGameBadges: async (clubId, game, type) => {
        if (failBadges) throw new Error('badges failed');
        created.badges.push({ clubId, type, players: game.players });
        return [];
    },
}));
vi.mock('./club.deletion.js', () => ({ deleteClubData: async (club) => { created.deleted.push(club._id); } }));

const { addEveningPlayer, adoptEvening, eveningError, eveningGameError, eveningReport, eveningView, newEvening, setEveningPlayerLeft, takeOverLateGame } = await import('./evenings.js');

const evening = {
    _id: 'e1',
    players: [{ id: 'q1', name: 'Anna' }, { id: 'q2', name: 'Ben' }, { id: 'q3', name: 'Cleo' }],
    club: null,
    save: vi.fn(async () => {}),
};
const names = (ids) => ids.map(id => ({ id, nickname: evening.players.find(player => player.id === id).name }));

// a finished game of one leg of 501 where the first player throws 180, 180 and checks out 141
const x01Won = (players, at) => ({
    kind: 'x01', hasWinner: true, gameIsRunning: false, createdAt: at, updatedAt: at,
    data: storedOf('x01', {
        startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1,
        players, quickPlayers: names(players), currentPlayerTurn: players[0], flyingDarts: 'off',
        visits: [
            { player: players[0], darts: ['T20', 'T20', 'T20'] }, { player: players[1], darts: ['S20', 'S1', 'S5'] },
            { player: players[0], darts: ['T20', 'T20', 'T20'] }, { player: players[1], darts: ['S20', 'S1', 'S5'] },
            { player: players[0], darts: ['T20', 'T19', 'D12'] },
        ],
    }),
});

beforeEach(() => {
    for (const list of Object.values(created)) list.length = 0;
    quickGames = [];
    evening.club = null;
    Object.assign(stored, { club: null, adopting: null, adoptingClub: null });
    halfClubs = [];
    failBadges = false;
});

describe('a darts evening', () => {
    it('has 2 to 8 players with names of their own', () => {
        expect(eveningError({ names: ['Anna'] })).toMatch(/2 to 8/);
        expect(eveningError({ names: Array.from({ length: 9 }, (_, index) => `P${index}`) })).toMatch(/2 to 8/);
        expect(eveningError({ names: ['Anna', 'anna'] })).toMatch(/of their own/);
        expect(eveningError({ names: ['Anna', '<b>'] })).toMatch(/1 to 20/);
        expect(eveningError({ name: 'x'.repeat(61), names: ['Anna', 'Ben'] })).toMatch(/60/);
        expect(eveningError({ name: 'Friday', names: ['Anna', 'Ben'] })).toBeNull();
        const { fields, key } = newEvening({ name: ' Friday ', names: ['Anna', ' Ben '] });
        expect(fields).toMatchObject({ name: 'Friday', players: [{ id: 'q1', name: 'Anna' }, { id: 'q2', name: 'Ben' }] });
        expect(key).toHaveLength(48);
        expect(fields.shareToken.length).toBeGreaterThan(10);
    });

    it('plays only its own players, under their names, two to four at a time', () => {
        const game = { ...x01Won(['q1', 'q3'], new Date()).data, flyingDarts: 'off', quickPlayers: names(['q1', 'q3']) };
        expect(eveningGameError(evening, 'x01', game)).toBeNull();
        expect(eveningGameError(evening, 'x01', { ...game, quickPlayers: [{ id: 'q1', nickname: 'Anna' }, { id: 'q3', nickname: 'Someone' }] })).toMatch(/players of the evening/);
        expect(eveningGameError(evening, 'x01', { ...game, players: ['q1'], quickPlayers: names(['q1']), visits: [] })).toMatch(/2 to 4/);
    });

    it('takes in someone arriving later and keeps the games of who went home', () => {
        const later = { players: [{ id: 'q1', name: 'Anna' }, { id: 'q2', name: 'Ben' }] };
        const at = new Date(2026, 10, 7, 21, 10);
        expect(addEveningPlayer(later, ' anna ').error).toMatch(/name of their own/);
        expect(addEveningPlayer(later, '').error).toMatch(/1 to 20/);
        expect(addEveningPlayer(later, ' Cleo ', at).player).toEqual({ id: 'q3', name: 'Cleo', joinedAt: at, leftAt: null });
        for (const name of ['D', 'E', 'F', 'G', 'H']) addEveningPlayer(later, name);
        expect(later.players.map(player => player.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
        expect(addEveningPlayer(later, 'Ivo').error).toMatch(/2 to 8/);

        // gone home: not in a new game, back again; the time it first went home is kept
        const left = { players: [{ id: 'q1', name: 'Anna' }, { id: 'q2', name: 'Ben' }, { id: 'q3', name: 'Cleo' }] };
        const game = { ...x01Won(['q1', 'q3'], new Date()).data, flyingDarts: 'off', quickPlayers: names(['q1', 'q3']) };
        expect(setEveningPlayerLeft(left, 'q3', true, at).player.leftAt).toBe(at);
        expect(setEveningPlayerLeft(left, 'q3', true, new Date()).player.leftAt).toBe(at);
        expect(eveningGameError(left, 'x01', game)).toMatch(/went home/);
        expect(eveningReport(left, [x01Won(['q3', 'q1'], at)]).table[0]).toMatchObject({ id: 'q3', wins: 1 });
        expect(eveningView({ ...left, createdAt: at }, []).players[2]).toEqual({ id: 'q3', name: 'Cleo', joinedAt: null, leftAt: at });
        expect(setEveningPlayerLeft(left, 'q3', false).player.leftAt).toBeNull();
        expect(eveningGameError(left, 'x01', game)).toBeNull();
        expect(setEveningPlayerLeft(left, 'q9', true).error).toMatch(/no such player/);
    });

    it('reports the table, the awards, the head to head and the form', () => {
        const games = [
            x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0)),
            x01Won(['q1', 'q3'], new Date(2026, 9, 24, 20, 30)),
            x01Won(['q2', 'q3'], new Date(2026, 9, 24, 21, 0)),
            { ...x01Won(['q3', 'q1'], new Date(2026, 9, 24, 21, 30)), hasWinner: false, gameIsRunning: true },
        ];
        const report = eveningReport(evening, games);
        expect(report.played).toBe(3);
        expect(report.running).toBe(1);
        expect(report.table.map(row => [row.name, row.games, row.wins, row.winRate])).toEqual([['Anna', 2, 2, 100], ['Ben', 2, 1, 50], ['Cleo', 2, 0, 0]]);
        expect(report.table[0]).toMatchObject({ oneEighties: 4, highestCheckout: 141 });
        expect(report.table[0].average).toBeCloseTo(167, 0);
        expect(report.headToHead.q1).toEqual({ q2: 1, q3: 1 });
        expect(report.headToHead.q2).toEqual({ q1: 0, q3: 1 });
        expect(report.form.q1).toHaveLength(2);
        expect(report.awards.map(award => [award.id, award.player])).toEqual([['champion', 'q1'], ['average', 'q1'], ['oneEighties', 'q1'], ['checkout', 'q1'], ['woodenSpoon', 'q3']]);
    });

    it('becomes a club with its players and finished games, the user linked to their player', async () => {
        quickGames = [{ ...x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0)), _id: 'g1' }];
        const user = { _id: 'u1', firstname: 'Ben', lastname: 'Keller' };
        const result = await adoptEvening(evening, user, { name: 'Friday Club', me: 'q2' });
        expect(created.clubs[0]).toMatchObject({ name: 'Friday Club', admins: ['u1'] });
        expect(created.players.map(player => [player.nickname, player.user ?? null])).toEqual([['Anna', null], ['Ben', 'u1'], ['Cleo', null]]);
        expect(created.games).toHaveLength(1);
        expect(created.games[0].doc).toMatchObject({ club: 'club1', players: ['p1', 'p2'], friendly: false });
        expect(created.games[0].doc.visits[0].player).toBe('p1');
        expect(created.badges).toEqual([{ clubId: 'club1', type: 'x01', players: ['p1', 'p2'] }]);
        expect(result.games).toBe(1);
        expect(evening.club).toBe('club1');
        await expect(adoptEvening(evening, user, { name: 'Again' })).rejects.toMatchObject({ status: 409 });
        // a copy loaded before it became a club is refused too
        await expect(adoptEvening({ ...evening, club: null }, user, { name: 'Again' })).rejects.toMatchObject({ status: 409 });
        expect(created.clubs).toHaveLength(1);
    });

    it('becomes one club only, also with two requests at once', async () => {
        quickGames = [{ ...x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0)), _id: 'g1' }];
        const user = { _id: 'u1', firstname: 'Ben', lastname: 'Keller' };
        const results = await Promise.allSettled([
            adoptEvening({ ...evening, club: null }, user, { name: 'One' }),
            adoptEvening({ ...evening, club: null }, user, { name: 'Two' }),
        ]);
        expect(results.map(result => result.status).sort()).toEqual(['fulfilled', 'rejected']);
        expect(results.find(result => result.status === 'rejected').reason.status).toBe(409);
        expect(created.clubs).toHaveLength(1);
        expect(created.players).toHaveLength(3);
        expect(created.games).toHaveLength(1);
    });

    it('leaves nothing behind when making the club fails, and can be tried again', async () => {
        quickGames = [{ ...x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0)), _id: 'g1' }];
        const user = { _id: 'u1', firstname: 'Ben', lastname: 'Keller' };
        failBadges = true;
        await expect(adoptEvening(evening, user, { name: 'Friday Club' })).rejects.toThrow('badges failed');
        expect(created.deleted).toEqual(['club1']);
        expect(stored).toMatchObject({ club: null, adopting: null, clubPlayers: [] });
        expect(evening.club).toBeNull();
        expect(quickGames[0].takenOver).toBe(false);

        failBadges = false;
        const result = await adoptEvening(evening, user, { name: 'Friday Club' });
        expect(result.club._id).toBe('club2');
        expect(result.games).toBe(1);
        expect(stored.club).toBe('club2');
    });

    it('removes the half club of a request that stopped part-way, once the hold is over', async () => {
        quickGames = [{ ...x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0)), _id: 'g1' }];
        const user = { _id: 'u1', firstname: 'Ben', lastname: 'Keller' };
        // the server stopped after making the club and its players, before the evening was told
        halfClubs = [{ _id: 'half1', name: 'Friday Club' }];
        Object.assign(stored, { adopting: new Date(Date.now() - 60 * 1000), adoptingClub: 'half1' });
        // within the hold: refused, nothing removed
        await expect(adoptEvening(evening, user, { name: 'Friday Club' })).rejects.toMatchObject({ status: 409 });
        expect(created.deleted).toEqual([]);

        stored.adopting = new Date(Date.now() - 11 * 60 * 1000);
        const result = await adoptEvening(evening, user, { name: 'Friday Club' });
        expect(created.deleted).toEqual(['half1']);
        expect(created.clubs).toHaveLength(1);
        expect(result.games).toBe(1);
        expect(stored).toMatchObject({ club: 'club1', adopting: null, adoptingClub: null });
    });

    it('notes the club on the evening before making it', async () => {
        const user = { _id: 'u1', firstname: 'Ben', lastname: 'Keller' };
        failBadges = true;
        quickGames = [{ ...x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0)), _id: 'g1' }];
        await expect(adoptEvening(evening, user, { name: 'Friday Club' })).rejects.toThrow('badges failed');
        expect(created.noted).toHaveLength(1);
        expect(String(created.noted[0])).toMatch(/^[0-9a-f]{24}$/);
        // removed after the failure: no longer noted
        expect(stored.adoptingClub).toBeNull();
    });

    it('takes a game still running over into the club once it is finished', async () => {
        const running = { ...x01Won(['q1', 'q3'], new Date(2026, 9, 24, 21, 0)), _id: 'g2', hasWinner: false, gameIsRunning: true, evening: 'e1' };
        quickGames = [{ ...x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0)), _id: 'g1' }, running];
        const user = { _id: 'u1', firstname: 'Ben', lastname: 'Keller' };
        const result = await adoptEvening(evening, user, { name: 'Friday Club' });
        expect(result.games).toBe(1);
        expect(stored.clubPlayers).toEqual([{ id: 'q1', player: 'p1' }, { id: 'q2', player: 'p2' }, { id: 'q3', player: 'p3' }]);

        // finished afterwards: in the club with the club's players, and only once
        Object.assign(running, { hasWinner: true, gameIsRunning: false });
        expect(await takeOverLateGame(running)).toBe(true);
        expect(await takeOverLateGame({ ...running, takenOver: false })).toBe(false);
        expect(created.games).toHaveLength(2);
        expect(created.games[1].doc).toMatchObject({ club: 'club1', players: ['p1', 'p3'] });
        // a quick game of no evening stays a quick game
        expect(await takeOverLateGame({ ...running, _id: 'g3', evening: null })).toBe(false);
    });
});
