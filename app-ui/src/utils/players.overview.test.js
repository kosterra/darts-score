import { describe, expect, it } from 'vitest';
import { playersOverview } from './players.overview';

const now = new Date(2026, 9, 23, 15, 0);
const players = [
    { id: 'a', nickname: 'Ace', createdAt: '2026-10-20T10:00:00Z', dateOfBirth: '1990-10-23T00:00:00.000Z', user: 'u1' },
    { id: 'b', nickname: 'Bull', createdAt: '2025-01-01T10:00:00Z', dateOfBirth: '1985-11-10' },
    { id: 'c', nickname: 'Cork', createdAt: '2026-02-01T10:00:00Z', dateOfBirth: '2000-01-05' },
    { id: 'd', nickname: 'Dart', createdAt: '2026-10-01T10:00:00Z' },
    { id: 'g', nickname: 'Guest', guest: true, createdAt: '2026-10-22T10:00:00Z' },
];
const levels = {
    a: { id: 'pubPlayer', name: 'Pub player', index: 2, xp: 300 },
    b: { id: 'pro', name: 'Pro', index: 6, xp: 5000 },
    c: { id: 'pubPlayer', name: 'Pub player', index: 2, xp: 250 },
};

describe('playersOverview', () => {
    it('counts members, guests, logins and newcomers', () => {
        const overview = playersOverview(players, levels, now);
        expect(overview).toMatchObject({ members: 4, guests: 1, withLogin: 1, newLately: 2 });
        expect(overview.newest.map(player => player.id)).toEqual(['a', 'd', 'c', 'b']);
    });

    it('ranks the members by XP and spreads them over the levels, highest first', () => {
        const overview = playersOverview(players, levels, now);
        expect(overview.ranking.map(entry => entry.playerId)).toEqual(['b', 'a', 'c']);
        expect(overview.levels).toEqual([
            { id: 'pro', name: 'Pro', index: 6, count: 1 },
            { id: 'pubPlayer', name: 'Pub player', index: 2, count: 2 },
        ]);
    });

    it('lists the birthdays of the next 30 days, today first', () => {
        const overview = playersOverview(players, levels, now);
        expect(overview.birthdays.map(entry => [entry.player.id, entry.inDays])).toEqual([['a', 0], ['b', 18]]);
    });

    it('finds what the admins could complete', () => {
        const overview = playersOverview(players, levels, now);
        expect(overview.withoutBirth.map(player => player.id)).toEqual(['d']);
        expect(overview.withoutLogin.map(player => player.id)).toEqual(['b', 'c', 'd']);
    });
});
