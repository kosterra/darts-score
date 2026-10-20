import { describe, it, expect } from 'vitest';
import { fairPlayNotices } from './notices.js';

const club = { id: 'c1', name: 'Bullseye Club' };
const item = (id, extra = {}) => ({
    type: 'x01', id, club, summary: 'X01 · 501', at: new Date(2026, 9, 12, 20, 0),
    players: [{ nickname: 'Larita', user: 'u-larita' }, { nickname: 'Max', user: null }],
    admins: ['u-admin'], reasons: ['A score left that does not add up'],
    ...extra,
});
const actor = { id: 'u-global', name: 'Gia Global' };

describe('fair play notifications', () => {
    it('tells the player with an account and the club admin, not the player without one', () => {
        const notices = fairPlayNotices([item('g1')], 'deleted', actor);
        expect(notices.map(notice => notice.user).sort()).toEqual(['u-admin', 'u-larita']);
        const own = notices.find(notice => notice.user === 'u-larita');
        expect(own).toMatchObject({ kind: 'fairPlayDeleted', title: 'Your game was deleted for fair play', club: 'c1', by: 'u-global', byName: 'Gia Global', link: null });
        expect(own.body).toBe('X01 · 501, played on 12.10.2026, by Larita, Max. Why: A score left that does not add up. The badges earned in it were taken back; badges earned again elsewhere stay.');
        expect(notices.find(notice => notice.user === 'u-admin').title).toBe('A game in Bullseye Club was deleted for fair play');
    });

    it('does not tell the one who did it', () => {
        const notices = fairPlayNotices([item('g1')], 'deleted', { id: 'u-admin', name: 'Ada Admin' });
        expect(notices.map(notice => notice.user)).toEqual(['u-larita']);
    });

    it('sums up several at once per club, and links a repaired game', () => {
        const notices = fairPlayNotices([item('g1'), item('g2'), item('t1', { type: 'training', summary: 'Around the Clock training' })], 'deleted', actor);
        const admin = notices.find(notice => notice.user === 'u-admin');
        expect(admin.title).toBe('2 games and 1 training in Bullseye Club deleted for fair play');
        expect(notices.filter(notice => notice.user === 'u-larita')).toHaveLength(1);

        const [repaired] = fairPlayNotices([item('g1', { admins: [] })], 'repaired', actor);
        expect(repaired).toMatchObject({ kind: 'fairPlayRepaired', title: 'Your game was repaired', link: '/stats/games/x01/g1' });
    });
});
