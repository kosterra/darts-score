import { describe, expect, it, vi } from 'vitest';

// the club's games and players of a test, in memory
const db = vi.hoisted(() => ({}));
vi.mock('../models/db.model.js', () => ({ default: db }));
const { clubYear, yearAwards, AVERAGE_MIN_GAMES } = await import('./club.year.js');

const row = (id, fields = {}) => ({ id, games: 0, wins: 0, x01Games: 0, points: 0, darts: 0, oneEighties: 0, highestCheckout: 0, clubNights: 0, ...fields });
// an X01 average as points and darts
const x01 = (games, average) => ({ x01Games: games, darts: games * 30, points: games * 10 * average });

describe('the awards of the club\'s year', () => {
    it('go to whoever leads in each', () => {
        const awards = yearAwards([
            row('anna', { games: 40, wins: 25, ...x01(30, 60), oneEighties: 4, highestCheckout: 121, clubNights: 30 }),
            row('ben', { games: 50, wins: 20, ...x01(40, 55), oneEighties: 9, highestCheckout: 100, clubNights: 40 }),
            row('cleo', { games: 30, wins: 5, ...x01(20, 45), highestCheckout: 140, clubNights: 12 }),
        ]);
        expect(Object.fromEntries(awards.map(award => [award.id, [award.player, award.value]]))).toEqual({
            champion: ['anna', 25], mostGames: ['ben', 50], average: ['anna', 60], oneEighties: ['ben', 9], checkout: ['cleo', 140], clubNights: ['ben', 40], woodenSpoon: ['cleo', 5],
        });
    });

    it('the best average only with enough X01 games', () => {
        const awards = yearAwards([
            row('anna', { games: AVERAGE_MIN_GAMES - 1, ...x01(AVERAGE_MIN_GAMES - 1, 90) }),
            row('ben', { games: 30, ...x01(30, 50) }),
        ]);
        expect(awards.find(award => award.id === 'average')).toMatchObject({ player: 'ben', value: 50 });
    });

    it('none without games, and no wooden spoon among two', () => {
        expect(yearAwards([row('anna'), row('ben')])).toEqual([]);
        const awards = yearAwards([row('anna', { games: 10, wins: 7 }), row('ben', { games: 10, wins: 3 })]);
        expect(awards.map(award => award.id)).not.toContain('woodenSpoon');
    });
});

describe('the club\'s year', () => {
    const lean = (value) => ({ lean: async () => value, sort: () => ({ lean: async () => value[0] ?? null }) });
    const at = new Date('2026-05-01T19:00:00Z');
    // a game of the rules engine: what is stored is what is shown
    const game = (players, winners) => ({ kind: 'shanghai', players, createdAt: at, hasWinner: true, playerModels: Object.fromEntries(players.map(id => [id, { hasWonGame: winners.includes(id) }])) });

    it('gives both partners of doubles the win, and none for a game alone', async () => {
        const games = [game(['a', 'b', 'c', 'd'], ['a', 'c']), game(['a', 'b', 'c', 'd'], ['a', 'c']), game(['b', 'c'], ['c']), game(['b'], ['b'])];
        Object.assign(db, {
            player: { find: () => lean(['a', 'b', 'c', 'd'].map(id => ({ _id: id, nickname: id.toUpperCase() }))) },
            x01: { find: () => lean([]), findOne: () => lean([]) },
            cricket: { find: () => lean([]), findOne: () => lean([]) },
            elimination: { find: () => lean([]), findOne: () => lean([]) },
            clock: { find: () => lean([]), findOne: () => lean([]) },
            rulesGame: { find: () => lean(games), findOne: () => lean(games) },
            attendance: { find: () => lean([]) },
        });
        const year = await clubYear({ _id: 'club', name: 'Club' }, 2026, new Date('2026-11-01T12:00:00Z'));
        // c won both doubles with a and one game against b; b won only alone
        expect(year.awards.find(award => award.id === 'champion')).toMatchObject({ player: { id: 'c' }, value: 3 });
        const spoon = year.awards.find(award => award.id === 'woodenSpoon');
        expect(['b', 'd']).toContain(spoon.player.id);
        expect(spoon.value).toBe(0);
    });
});
