import { describe, expect, it, vi, beforeEach } from 'vitest';
import { storedOf } from './game.view.js';

// what making a club creates, in memory
const created = { clubs: [], players: [], games: [], badges: [] };
let quickGames = [];
vi.mock('../models/db.model.js', () => {
    const gameModel = (type) => ({
        create: async (doc) => { const game = { ...doc, _id: `${type}-${created.games.length + 1}`, toObject: () => ({ ...doc }) }; created.games.push({ type, doc }); return game; },
        updateOne: async () => ({}),
    });
    return {
        default: {
            club: { create: async (doc) => { const club = { ...doc, _id: 'club1' }; created.clubs.push(club); return club; } },
            player: { create: async (doc) => { const player = { ...doc, _id: `p${created.players.length + 1}` }; created.players.push(player); return player; } },
            quickGame: { find: () => ({ sort: () => ({ lean: async () => quickGames }) }) },
            x01: gameModel('x01'), cricket: gameModel('cricket'), elimination: gameModel('elimination'),
        },
    };
});
vi.mock('./badge.service.js', () => ({ syncGameBadges: async (clubId, game, type) => { created.badges.push({ clubId, type, players: game.players }); return []; } }));

const { adoptEvening, eveningError, eveningGameError, eveningReport, newEvening } = await import('./evenings.js');

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
        quickGames = [x01Won(['q1', 'q2'], new Date(2026, 9, 24, 20, 0))];
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
    });
});
