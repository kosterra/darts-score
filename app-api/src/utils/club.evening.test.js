import { describe, expect, it, vi } from 'vitest';

// two members, one guest of another club; three games of the night, one with the guest
const games = {
    x01: [
        { _id: 'g1', club: 'c1', players: ['p1', 'p2'], hasWinner: true, gameIsRunning: false, createdAt: new Date('2026-11-03T19:00:00Z'), updatedAt: new Date('2026-11-03T19:20:00Z'), startingScore: 301, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1,
            visits: [{ player: 'p1', darts: ['T20', 'T20', 'T20'] }, { player: 'p2', darts: ['S1', 'S1', 'S1'] }, { player: 'p1', darts: ['T20', 'T11', 'D14'] }] },
        { _id: 'g2', club: 'c1', players: ['p1', 'p9'], hasWinner: false, gameIsRunning: true, createdAt: new Date('2026-11-03T20:00:00Z'), updatedAt: new Date('2026-11-03T20:00:00Z'), startingScore: 301, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1, visits: [] },
    ],
    cricket: [],
    elimination: [],
};
const lean = (value) => ({ lean: async () => value });
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        player: { find: () => lean([{ _id: 'p1', nickname: 'Anna' }, { _id: 'p2', nickname: 'Ben' }]) },
        x01: { find: () => lean(games.x01) },
        cricket: { find: () => lean(games.cricket) },
        elimination: { find: () => lean(games.elimination) },
    },
}));
vi.mock('./notify.js', () => ({ deliverQuietly: async () => [] }));
vi.mock('./quick.tally.js', () => ({ countEvening: vi.fn() }));

const { clubEvening } = await import('./calendar.js');

describe('the club evening of a night', () => {
    it('takes the club games among its players only, with the table of a darts evening', async () => {
        const evening = await clubEvening({ _id: 'c1' }, { from: new Date('2026-11-03T17:00:00Z'), to: new Date('2026-11-04T05:00:00Z'), players: ['p1', 'p2', 'p9'] });
        // p9 is no member: left out, and the game with them too
        expect(evening.players.map(player => player.name)).toEqual(['Anna', 'Ben']);
        expect(evening.games.map(game => game.id)).toEqual(['g1']);
        expect(evening.report.table[0]).toMatchObject({ name: 'Anna', wins: 1, games: 1 });
        expect(evening.report.played).toBe(1);
    });
});
