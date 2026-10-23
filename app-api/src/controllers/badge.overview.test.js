import { describe, expect, it } from 'vitest';
import { clubBadgeOverview } from './badge.controller.js';
import { BADGES } from '../utils/badges.js';

const now = new Date('2026-10-23T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 864e5);
const [first, second] = BADGES;

describe('the badge overview of a club', () => {
    it('ranks the players, keeps what was earned lately and finds the rare and unclaimed badges', () => {
        const players = [
            { _id: 'a', nickname: 'Anna', badges: [{ badge: first.id, earnedAt: daysAgo(2) }, { badge: second.id, earnedAt: daysAgo(40) }] },
            { _id: 'b', nickname: 'Ben', badges: [{ badge: first.id, earnedAt: daysAgo(1) }] },
            { _id: 'c', nickname: 'Cleo', badges: [] },
        ];
        const overview = clubBadgeOverview(players, now);
        expect(overview).toMatchObject({ total: BADGES.length, earned: 3, earnedLast30Days: 2, collectors: 2 });
        expect(overview.players.map(player => player.nickname)).toEqual(['Anna', 'Ben', 'Cleo']);
        expect(overview.recent[0]).toMatchObject({ player: { nickname: 'Ben' }, badge: { id: first.id } });
        expect(overview.rare[0]).toMatchObject({ badge: { id: second.id }, holders: [{ nickname: 'Anna' }] });
        expect(overview.unclaimed).toHaveLength(BADGES.length - 2);
    });
});
