import { describe, expect, it } from 'vitest';
import { clubsOverview, perWeek, quickGamesOverview, usersOverview } from './admin.overviews';

const now = new Date('2026-10-23T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('perWeek', () => {
    it('counts the last twelve weeks, this week last', () => {
        const weeks = perWeek([daysAgo(1), daysAgo(2), daysAgo(8), daysAgo(200)], now);
        expect(weeks).toHaveLength(12);
        expect(weeks.map(week => week.count).slice(-2)).toEqual([1, 2]);
    });
});

describe('usersOverview', () => {
    const users = [
        { id: 'g', role: 'globalAdmin', clubs: [], language: 'de', createdAt: daysAgo(400), lastLoginAt: daysAgo(1) },
        { id: 'a', role: 'user', clubs: [{ role: 'admin' }], language: 'de', createdAt: daysAgo(5), lastLoginAt: daysAgo(2) },
        { id: 'p', role: 'user', clubs: [{ role: 'player' }], language: null, createdAt: daysAgo(300), lastLoginAt: daysAgo(250), blockedAt: daysAgo(10) },
        { id: 'n', role: 'user', clubs: [], language: 'fr', createdAt: daysAgo(40), lastLoginAt: null },
    ];

    it('counts the users, the new, the active and the blocked ones', () => {
        expect(usersOverview(users, now)).toMatchObject({ total: 4, newLately: 1, activeLately: 2, blocked: 1 });
    });

    it('sorts them by what they are and by language', () => {
        const overview = usersOverview(users, now);
        expect(overview.roles).toEqual({ globalAdmin: 1, clubAdmin: 1, player: 1, noClub: 1 });
        expect(overview.languages).toEqual([{ code: 'de', count: 2 }, { code: 'browser', count: 1 }, { code: 'fr', count: 1 }]);
    });

    it('finds the accounts to look after', () => {
        const overview = usersOverview(users, now);
        expect(overview.neverLoggedIn.map(user => user.id)).toEqual(['n']);
        expect(overview.inactive.map(user => user.id)).toEqual(['p']);
        expect(overview.withoutClub.map(user => user.id)).toEqual(['n']);
    });
});

describe('quickGamesOverview', () => {
    it('counts the games, the formats and the players per game', () => {
        const overview = quickGamesOverview([
            { kind: 'x01', format: '501', names: ['A', 'B'], finished: true, createdAt: daysAgo(1) },
            { kind: 'x01', format: '501', names: ['A'], finished: false, createdAt: daysAgo(10) },
            { kind: 'cricket', format: 'Standard', names: ['A', 'B', 'C', 'D', 'E'], finished: true, createdAt: daysAgo(3) },
        ], now);
        expect(overview).toMatchObject({ total: 3, running: 1, finished: 2, finishRate: 67, last7Days: 2 });
        expect(overview.formats[0]).toEqual({ kind: 'x01', format: '501', count: 2 });
        expect(overview.sizes).toEqual([{ players: 1, count: 1 }, { players: 2, count: 1 }, { players: 4, count: 1 }]);
    });
});

describe('clubsOverview', () => {
    it('counts the clubs and finds the largest, the busiest, the quiet and the newest', () => {
        const clubs = [
            { id: 'a', isPublic: true, needsAdmin: false, playerCount: 20, gameCount: 300, lastActivityAt: daysAgo(2), createdAt: daysAgo(500) },
            { id: 'b', isPublic: false, needsAdmin: true, playerCount: 3, gameCount: 0, lastActivityAt: daysAgo(200), createdAt: daysAgo(200) },
            { id: 'c', isPublic: false, needsAdmin: false, playerCount: 8, gameCount: 40, lastActivityAt: daysAgo(100), createdAt: daysAgo(5) },
        ];
        const overview = clubsOverview(clubs, now);
        expect(overview).toMatchObject({ total: 3, public: 1, activeLately: 1, needsAdmin: 1 });
        expect(overview.largest.map(club => club.id)).toEqual(['a', 'c', 'b']);
        expect(overview.mostGames.map(club => club.id)).toEqual(['a', 'c']);
        expect(overview.quiet.map(club => club.id)).toEqual(['b', 'c']);
        expect(overview.newest.map(club => club.id)).toEqual(['c', 'b', 'a']);
    });
});
