import { describe, it, expect } from 'vitest';
import { deletionNotices, tally } from './deletion.requests.js';

const request = (players, extra = {}) => ({
    _id: 'r1', club: 'c1', type: 'x01', game: 'g1', summary: 'X01 · 501', playedAt: new Date(2026, 9, 12, 20, 0),
    by: 'u-anna', byName: 'Anna Muster', reason: 'Played on the wrong board', players, ...extra,
});
const anna = { player: 'p1', nickname: 'Anna', user: 'u-anna', answer: 'agreed' };
const ben = { player: 'p2', nickname: 'Ben', user: 'u-ben', answer: null };
const cleo = { player: 'p3', nickname: 'Cleo', user: null, answer: null };

describe('deletion requests', () => {
    it('counts the answers; everyone agreed only with a login for every player', () => {
        expect(tally(request([anna, ben]))).toMatchObject({ agreed: 1, declined: 0, total: 2, withoutLogin: 0, everyoneAgreed: false });
        expect(tally(request([anna, { ...ben, answer: 'agreed' }])).everyoneAgreed).toBe(true);
        expect(tally(request([anna, cleo])).everyoneAgreed).toBe(false);
        expect(tally(request([anna, { ...ben, answer: 'declined' }])).declined).toBe(1);
    });

    it('asks the other players with a login and the admins, not the one who asked', () => {
        const notices = deletionNotices('requested', request([anna, ben, cleo]), { actor: { id: 'u-anna', name: 'Anna Muster' }, clubName: 'Test Club', admins: ['u-admin'] });
        expect(notices.map(notice => notice.user).sort()).toEqual(['u-admin', 'u-ben']);
        const admin = notices.find(notice => notice.user === 'u-admin');
        expect(admin).toMatchObject({ kind: 'deletionRequested', title: 'Anna Muster asks to delete a game in Test Club', link: '/games?deletion=r1', club: 'c1' });
        expect(admin.body).toBe('X01 · 501, played on 12.10.2026. Reason: Played on the wrong board. One player has no login, so an admin decides. Delete the game or keep it.');
        expect(notices.find(notice => notice.user === 'u-ben').title).toBe('Anna Muster asks to delete a game you played');
    });

    it('tells everyone but the one who decided how it ended', () => {
        const deleted = deletionNotices('deleted', request([anna, ben]), { actor: { id: 'u-admin', name: 'Ada Admin' }, admins: ['u-admin'] });
        expect(deleted.map(notice => [notice.user, notice.title])).toEqual([
            ['u-anna', 'The game you asked to delete was deleted'],
            ['u-ben', 'A game you played was deleted'],
        ]);
        expect(deleted[0].body).toBe('X01 · 501, played on 12.10.2026. Deleted by Ada Admin. The badges earned in it were taken back.');

        const auto = deletionNotices('deleted', request([anna, ben]), { actor: { id: 'u-ben', name: 'Ben Keller' }, admins: ['u-admin'], auto: true });
        expect(auto.map(notice => notice.user)).toEqual(['u-anna', 'u-admin']);
        expect(auto[0].body).toContain('Every player agreed.');

        const [kept] = deletionNotices('kept', request([anna], { note: 'The game was real' }), { actor: { id: 'u-admin', name: 'Ada Admin' }, admins: ['u-admin'] });
        expect(kept).toMatchObject({ kind: 'deletionKept', title: 'The game you asked to delete stays', body: 'X01 · 501, played on 12.10.2026. Ada Admin kept it: The game was real.', link: '/stats/games/x01/g1' });
    });
});
