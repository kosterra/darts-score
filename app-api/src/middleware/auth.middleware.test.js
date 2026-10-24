import { describe, expect, it, vi, beforeEach } from 'vitest';

// one account, the sessions kept on the server, and what was recorded
const anna = { _id: { toString: () => 'u1' }, sessionVersion: 0, blockedAt: null };
const live = new Set();
const recorded = [];
vi.mock('../models/db.model.js', () => ({
    default: { user: { findById: async (id) => (id === 'u1' ? anna : null) }, mongoose: { isValidObjectId: () => true } },
}));
vi.mock('../utils/session.settings.js', () => ({ getSessionTimeoutMs: async () => 5 * 60 * 60 * 1000, cappedExpiry: (exp) => ({ exp, cut: false }) }));
vi.mock('../utils/sessions.js', () => ({
    findSession: async (sid) => (live.has(sid) ? { sid } : null),
    recordSession: async (req, user, expiresAt, { sid }) => { const id = sid ?? 'fresh'; recorded.push(id); live.add(id); return id; },
}));

const { requireAuth } = await import('./auth.middleware.js');

const request = (session) => ({ signedCookies: { ds_session: session }, get: () => '', secure: false });
const answer = () => {
    const res = { cookies: {}, statusCode: 200 };
    res.cookie = (name, value) => { res.cookies[name] = value; return res; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
};
const later = Date.now() + 60 * 60 * 1000;

beforeEach(() => { live.clear(); recorded.length = 0; });

describe('a session kept on the server', () => {
    it('lets a running session through, with its id', async () => {
        live.add('s1');
        const req = request({ uid: 'u1', v: 0, exp: later, sid: 's1' });
        const next = vi.fn();
        await requireAuth(req, answer(), next);
        expect(next).toHaveBeenCalled();
        expect(req.sessionId).toBe('s1');
    });

    it('refuses a session that was ended (logged out elsewhere or by a global admin)', async () => {
        const res = answer();
        const next = vi.fn();
        await requireAuth(request({ uid: 'u1', v: 0, exp: later, sid: 'ended' }), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
    });

    it('gives a login from before sessions were kept its record, without logging out', async () => {
        const res = answer();
        const next = vi.fn();
        await requireAuth(request({ uid: 'u1', v: 0, exp: later }), res, next);
        expect(next).toHaveBeenCalled();
        expect(recorded).toEqual(['fresh']);
        expect(res.cookies.ds_session).toMatchObject({ uid: 'u1', sid: 'fresh', exp: later });
    });
});
