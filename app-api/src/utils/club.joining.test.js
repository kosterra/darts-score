import { describe, it, expect } from 'vitest';
import { joinBlock, joinNotices, ASK_AGAIN_AFTER_DAYS, MAX_OPEN_REQUESTS } from './club.joining.js';

const now = new Date(2026, 9, 21, 12, 0);
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe('joining a club', () => {
    it('lets anyone join an open club, and ask an approval club', () => {
        expect(joinBlock({ policy: 'open', now })).toBeNull();
        expect(joinBlock({ policy: 'approval', now })).toBeNull();
    });

    it('turns away closed clubs, members, global admins and a second request', () => {
        expect(joinBlock({ policy: 'closed', now }).status).toBe(403);
        expect(joinBlock({ policy: undefined, now }).status).toBe(403);
        expect(joinBlock({ policy: 'open', isMember: true, now }).status).toBe(409);
        expect(joinBlock({ policy: 'open', isGlobalAdmin: true, now }).status).toBe(403);
        expect(joinBlock({ policy: 'approval', hasOpenRequest: true, now }).message).toMatch(/asked to join this club already/);
    });

    it('waits after a declined request, and limits the open requests', () => {
        expect(joinBlock({ policy: 'approval', declinedAt: daysAgo(1), now }).status).toBe(409);
        expect(joinBlock({ policy: 'approval', declinedAt: daysAgo(ASK_AGAIN_AFTER_DAYS + 0.1), now })).toBeNull();
        // an open club does not hold the old answer against anyone
        expect(joinBlock({ policy: 'open', declinedAt: daysAgo(1), now })).toBeNull();
        expect(joinBlock({ policy: 'approval', openRequests: MAX_OPEN_REQUESTS, now }).status).toBe(429);
        expect(joinBlock({ policy: 'approval', openRequests: MAX_OPEN_REQUESTS - 1, now })).toBeNull();
    });

    const request = { _id: 'r1', club: 'c1', user: 'u-ben', name: 'Ben Muster', nickname: 'Benny', message: 'I play on Tuesdays' };
    const ben = { id: 'u-ben', name: 'Ben Muster' };
    const ada = { id: 'u-ada', name: 'Ada Admin' };

    it('asks every admin, and tells them who joined an open club', () => {
        const asked = joinNotices('requested', { request, clubName: 'Test Club', admins: ['u-ada', 'u-ida', 'u-ada'], actor: ben });
        expect(asked.map(notice => notice.user)).toEqual(['u-ada', 'u-ida']);
        expect(asked[0]).toMatchObject({ kind: 'joinRequested', title: 'Ben Muster asks to join Test Club', link: '/players?requests=1', club: 'c1', by: 'u-ben' });
        expect(asked[0].body).toBe('As Benny. "I play on Tuesdays" Accept or decline on the players page.');
        const joined = joinNotices('joined', { request, clubName: 'Test Club', admins: ['u-ada'], actor: ben });
        expect(joined).toMatchObject([{ user: 'u-ada', kind: 'clubJoined', title: 'Ben Muster joined Test Club' }]);
    });

    it('tells the one who asked how the admins decided', () => {
        expect(joinNotices('accepted', { request, clubName: 'Test Club', actor: ada }))
            .toMatchObject([{ user: 'u-ben', kind: 'joinAccepted', title: 'Welcome to Test Club', link: '/', club: 'c1' }]);
        expect(joinNotices('declined', { request, clubName: 'Test Club', actor: ada })[0])
            .toMatchObject({ user: 'u-ben', kind: 'joinDeclined', link: '/my-clubs' });
        // nobody is told about what they did themselves
        expect(joinNotices('requested', { request, admins: ['u-ben'], actor: ben })).toEqual([]);
        expect(joinNotices('accepted', { request, actor: ben })).toEqual([]);
    });
});
