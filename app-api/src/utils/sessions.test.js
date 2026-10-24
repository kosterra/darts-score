import { describe, expect, it, vi, beforeEach } from 'vitest';

// the sessions, accounts and days of use, in memory
let sessions = [];
let users = [];
let today = null;
const deleted = [];
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        session: {
            find: () => ({ sort: () => ({ lean: async () => sessions }) }),
            deleteMany: async ({ _id }) => { deleted.push(..._id.$in.map(String)); },
        },
        user: { find: () => ({ lean: async () => users }) },
        usageDay: { findOne: () => ({ lean: async () => today }) },
    },
}));

const { deviceOf, loggedIn } = await import('./sessions.js');
const { usageLines, weekStart } = await import('./usage.stats.js');

const now = new Date(2026, 9, 24, 20, 0);
const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000);

beforeEach(() => { sessions = []; users = []; today = null; deleted.length = 0; });

describe('the device of a session', () => {
    it('names the browser and the system in a few words', () => {
        expect(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36')).toBe('Chrome · Windows');
        expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari · iPhone');
        expect(deviceOf('Mozilla/5.0 (Android 15; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0')).toBe('Firefox · Android');
        expect(deviceOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Edge · macOS');
        expect(deviceOf('')).toBe('');
    });
});

describe('who is logged in', () => {
    it('lists the accounts with their sessions, the most recent first, and counts them', async () => {
        users = [
            { _id: 'u1', firstname: 'Anna', lastname: 'Brunner', email: 'anna@example.ch', role: 'globalAdmin', sessionVersion: 0 },
            { _id: 'u2', firstname: 'Lex', lastname: 'Meier', email: 'lex@example.ch', role: 'user', sessionVersion: 0 },
        ];
        sessions = [
            { _id: 's1', sid: 'mine', user: 'u1', v: 0, device: 'Chrome · Windows', createdAt: minutesAgo(90), lastSeenAt: minutesAgo(1), expiresAt: minutesAgo(-200) },
            { _id: 's2', sid: 'b', user: 'u2', v: 0, device: 'Safari · iPhone', createdAt: minutesAgo(300), lastSeenAt: minutesAgo(40), expiresAt: minutesAgo(-60) },
            { _id: 's3', sid: 'c', user: 'u1', v: 0, device: 'Firefox · Android', createdAt: minutesAgo(600), lastSeenAt: minutesAgo(120), expiresAt: minutesAgo(-10) },
        ];
        today = { users: ['u1', 'u2', 'u3'] };
        const result = await loggedIn('mine', now);
        expect(result.totals).toEqual({ sessions: 3, users: 2, activeNow: 1, usedToday: 3 });
        expect(result.users.map(user => [user.firstname, user.sessions.length])).toEqual([['Anna', 2], ['Lex', 1]]);
        expect(result.users[0].sessions[0]).toMatchObject({ id: 's1', device: 'Chrome · Windows', current: true });
        expect(result.users[0].sessions[1].current).toBe(false);
        expect(JSON.stringify(result)).not.toContain('"sid"');
    });

    it('clears the sessions an account can no longer use: a new password, blocked or deleted', async () => {
        users = [
            { _id: 'u1', firstname: 'Anna', lastname: 'B', email: 'a@x', role: 'user', sessionVersion: 2 },
            { _id: 'u2', firstname: 'Lex', lastname: 'M', email: 'l@x', role: 'user', sessionVersion: 0, blockedAt: now },
        ];
        sessions = [
            { _id: 'old', sid: 'a', user: 'u1', v: 1, lastSeenAt: minutesAgo(1), expiresAt: minutesAgo(-60) },
            { _id: 'new', sid: 'b', user: 'u1', v: 2, lastSeenAt: minutesAgo(2), expiresAt: minutesAgo(-60) },
            { _id: 'blocked', sid: 'c', user: 'u2', v: 0, lastSeenAt: minutesAgo(3), expiresAt: minutesAgo(-60) },
            { _id: 'gone', sid: 'd', user: 'u9', v: 0, lastSeenAt: minutesAgo(4), expiresAt: minutesAgo(-60) },
        ];
        const result = await loggedIn(null, now);
        expect(deleted.sort()).toEqual(['blocked', 'gone', 'old']);
        expect(result.totals.sessions).toBe(1);
        expect(result.users[0].sessions.map(session => session.id)).toEqual(['new']);
    });
});

describe('the weekly usage', () => {
    it('starts the week on Monday', () => {
        expect(weekStart(new Date(2026, 9, 25, 23, 0))).toEqual(new Date(2026, 9, 19));
        expect(weekStart(new Date(2026, 9, 26, 7, 0), 1)).toEqual(new Date(2026, 9, 19));
    });

    it('gives each figure with its change against the week before', () => {
        const week = { tracked: true, activeUsers: 42, logins: 100, games: { total: 230 }, finishedGames: 200, activeClubs: 5, trainings: 0, quickGames: 3, newUsers: 4, newClubs: 1, newPlayers: 6, num180s: 0 };
        const before = { activeUsers: 40, logins: 100, games: { total: 250 }, finishedGames: 180, activeClubs: 5, trainings: 2, quickGames: 0, newUsers: 2, newClubs: 1, newPlayers: 6, num180s: 4 };
        const lines = usageLines(week, before);
        expect(lines).toContain('• Active users: 42 (+5 %)');
        expect(lines).toContain('• Logins: 100 (±0 %)');
        expect(lines).toContain('• Games started: 230 (-8 %)');
        expect(lines).toContain('• Quick games: 3 (+3)');
        expect(lines).toContain('• Trainings: 0 (-100 %)');
        expect(lines.some(line => line.includes('180s'))).toBe(false);
    });

    it('leaves out active users and logins before they were counted', () => {
        const week = { tracked: false, activeUsers: 0, logins: 0, games: { total: 1 }, finishedGames: 0, activeClubs: 0, trainings: 0, quickGames: 0, newUsers: 0, newClubs: 0, newPlayers: 0, num180s: 0 };
        expect(usageLines(week, null).some(line => line.includes('Active users'))).toBe(false);
    });
});
