import { describe, expect, it, vi } from 'vitest';

const x01 = (id, at, visits) => ({ _id: id, players: ['p1', 'p2'], hasWinner: true, gameIsRunning: false, createdAt: new Date(at), updatedAt: new Date(at), startingScore: 301, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1, visits });
const v = (player, ...darts) => ({ player, darts });
// p1 wins in March with a 180 and a 118 checkout, p2 wins in March and in July
const games = [
    x01('g1', '2026-03-10T19:00:00Z', [v('p1', 'T20', 'T20', 'T20'), v('p2', 'S1', 'S1', 'S1'), v('p1', 'S1', 'S1', 'S1'), v('p2', 'S1', 'S1', 'S1'), v('p1', 'T20', 'T18', 'D2')]),
    x01('g2', '2026-03-17T19:00:00Z', [v('p1', 'S1', 'S1', 'S1'), v('p2', 'T20', 'T20', 'T20'), v('p1', 'S1', 'S1', 'S1'), v('p2', 'T20', 'T11', 'D14')]),
    x01('g3', '2026-07-01T19:00:00Z', [v('p1', 'S1', 'S1', 'S1'), v('p2', 'T20', 'T20', 'T20'), v('p1', 'S1', 'S1', 'S1'), v('p2', 'T20', 'T11', 'D14')]),
];
const lean = (value) => ({ lean: async () => value });
const none = { find: () => lean([]) };
vi.mock('../models/db.model.js', () => ({
    default: {
        x01: { find: () => lean(games) },
        cricket: none, elimination: none, clock: none, rulesGame: none,
        player: {
            findById: (id) => lean(id === 'p2' ? { nickname: 'Ben' } : { nickname: 'Anna', badges: [{ badge: 'max180-1', earnedAt: new Date('2026-03-10T19:30:00Z') }, { badge: 'old', earnedAt: new Date('2025-05-01T00:00:00Z') }] }),
        },
        atc: { countDocuments: async () => 2 },
        x01Training: { countDocuments: async () => 1 },
        rulesTraining: { countDocuments: async () => 0 },
    },
}));

const { reviewYears, yearReview } = await import('./year.review.js');

describe('your year in darts', () => {
    it('counts the games, the wins, the X01 records, the busiest month and the rival', async () => {
        const review = await yearReview('p1', 2026);
        expect(review.games).toMatchObject({ total: 3, together: 3, wins: 1, winRate: 33, byType: { x01: 3 } });
        expect(review.x01).toMatchObject({ games: 3, oneEighties: 1, highestCheckout: 118 });
        expect(review.x01.bestGame.game).toBe('g1');
        expect(review.days).toBe(3);
        expect(review.busiestMonth).toEqual({ month: 3, games: 2 });
        expect(review.opponent).toEqual({ id: 'p2', nickname: 'Ben', games: 3, wins: 1 });
        expect(review.trainings).toBe(3);
        expect(review.badges.count).toBe(1);
        expect(review.badges.latest[0]).toMatchObject({ id: 'max180-1', earnedAt: new Date('2026-03-10T19:30:00Z') });
    });

    it('has a year to look back at from the first game on', () => {
        expect(reviewYears(new Date('2024-06-01'), new Date('2026-12-01'))).toEqual([2026, 2025, 2024]);
        expect(reviewYears(null)).toEqual([]);
    });
});
