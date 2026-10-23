import { describe, expect, it } from 'vitest';
import { activityInsights, playersInsights, WEEKS } from './admin.insights.js';

const now = new Date('2026-10-23T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('activityInsights', () => {
    const records = [
        { club: 'a', kind: 'x01', createdAt: daysAgo(1), updatedAt: daysAgo(1), running: true, finished: false, playerIds: ['p1', 'p2'] },
        { club: 'a', kind: 'x01', createdAt: daysAgo(20), updatedAt: daysAgo(20), running: true, finished: false, playerIds: ['p1'] },
        { club: 'b', kind: 'cricket', createdAt: daysAgo(3), updatedAt: daysAgo(3), running: false, finished: true, playerIds: ['p3'] },
        { club: 'b', kind: 'x01', createdAt: daysAgo(200), updatedAt: daysAgo(200), running: false, finished: true, playerIds: ['p4'] },
        { club: 'c', kind: 'x01', createdAt: daysAgo(100), updatedAt: daysAgo(100), running: false, finished: true, playerIds: ['p5'] },
    ];

    it('counts all, lately, running and left running, and who was active lately', () => {
        expect(activityInsights(records, now)).toMatchObject({ total: 5, last30Days: 3, running: 2, stuck: 1, players: 3, activeClubs: 2 });
    });

    it('spreads them over the last twelve weeks, with the finished ones', () => {
        const { weeks } = activityInsights(records, now);
        expect(weeks).toHaveLength(WEEKS);
        expect(weeks[WEEKS - 1]).toMatchObject({ count: 2, finished: 1 });
        expect(weeks[WEEKS - 3]).toMatchObject({ count: 1, finished: 0 });
        expect(weeks.reduce((sum, week) => sum + week.count, 0)).toBe(3);
    });

    it('ranks the kinds and the clubs, the most active first', () => {
        const insights = activityInsights(records, now);
        expect(insights.popular).toEqual([{ kind: 'x01', count: 4, last30Days: 2 }, { kind: 'cricket', count: 1, last30Days: 1 }]);
        expect(insights.clubs.map(club => [club.clubId, club.total, club.last30Days, club.running, club.stuck, club.players])).toEqual([
            ['a', 2, 2, 2, 1, 2], ['b', 2, 1, 0, 0, 1], ['c', 1, 0, 0, 0, 0],
        ]);
        expect(insights.clubs[0].lastAt).toBe(daysAgo(1));
    });
});

describe('playersInsights', () => {
    const players = [
        { clubs: ['a', 'b'], user: 'u1', createdAt: daysAgo(2) },
        { clubs: ['a'], createdAt: daysAgo(60) },
        { clubs: ['b'], createdAt: daysAgo(10) },
        { clubs: [], createdAt: daysAgo(400) },
        { clubs: ['a'], guest: true, createdAt: daysAgo(1) },
    ];

    it('counts each person once, the guests apart', () => {
        expect(playersInsights(players, now)).toMatchObject({ members: 4, guests: 1, multiClub: 1, withLogin: 1, withoutClub: 1, newLately: 2 });
    });

    it('gives every club its members, guests, logins and newcomers, the largest first', () => {
        const insights = playersInsights(players, now);
        expect(insights.clubs).toEqual([
            { clubId: 'a', members: 2, guests: 1, withLogin: 1, newLately: 1 },
            { clubId: 'b', members: 2, guests: 0, withLogin: 1, newLately: 2 },
        ]);
        expect(insights.weeks.reduce((sum, week) => sum + week.count, 0)).toBe(3);
    });
});
