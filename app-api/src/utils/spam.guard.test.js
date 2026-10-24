import { describe, it, expect, vi, beforeEach } from 'vitest';

// the alerts raised and the fair play hits kept, in memory
const alerts = [];
const hits = new Map();
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        alert: {
            findOne: async (query) => alerts.find(alert => alert.rule === query.rule && (!query.club || String(alert.club) === String(query.club)) && (!query.ip || alert.ip === query.ip) && (!query.user || alert.user === query.user)) ?? null,
            create: async (alert) => { const created = { ...alert, count: 1, save: async () => {} }; alerts.push(created); return created; },
        },
        fairPlayHit: {
            updateOne: async ({ sourceId }, { $setOnInsert }) => { if (!hits.has(sourceId)) hits.set(sourceId, $setOnInsert); },
            countDocuments: async ({ club }) => [...hits.values()].filter(hit => hit.club === club).length,
        },
        club: { findById: async (id) => ({ _id: id, name: 'Bullseye' }) },
    },
}));

const {
    noteQuickGame, noteJoinRequest, noteClubTexts, checkTakeover, noteDeleted,
    noteLoginFailure, noteResetRequest, noteClubBadges, noteFairPlay,
} = await import('./spam.guard.js');
const { isImpossible } = await import('./integrity.js');
const { withGameState } = await import('../rules/engine.js');
const { gameOf } = await import('../rules/games.js');

const HOUR = 60 * 60 * 1000;
let address = 0;
// every test from its own address and account, so the counters start at zero
const request = (extra = {}) => {
    address += 1;
    return { ip: `10.0.0.${address}`, user: { _id: `u${address}`, email: `u${address}@example.ch`, role: 'user' }, ...extra };
};
const rules = () => alerts.map(alert => alert.rule);

beforeEach(() => { alerts.length = 0; hits.clear(); });

describe('quick games', () => {
    it('alerts on many quick games from one address', async () => {
        const req = request();
        for (let i = 0; i < 20; i += 1) await noteQuickGame(req, { _id: `q${i}`, names: ['Anna', 'Ben'] });
        expect(rules()).toEqual([]);
        await noteQuickGame(req, { _id: 'q20', names: ['Anna'] });
        expect(rules()).toEqual(['quickBurst']);
    });

    it('checks the names of the players', async () => {
        await noteQuickGame(request(), { _id: 'q', names: ['Anna', 'visit www.spam.example'] });
        expect(rules()).toEqual(['linkInName']);
    });
});

describe('joining clubs', () => {
    const club = { _id: 'c1', name: 'Bullseye' };

    it('alerts on a web address in the message', async () => {
        await noteJoinRequest(request(), club, 'Cheap darts at https://spam.example');
        expect(rules()).toEqual(['linkInText']);
    });

    it('alerts on many requests of one account', async () => {
        const req = request();
        for (let i = 0; i < 11; i += 1) await noteJoinRequest(req, { _id: `c${i}`, name: `Club ${i}` }, 'Hi!');
        expect(rules()).toEqual(['joinBurst']);
    });
});

describe('club texts', () => {
    it('alerts on a web address in the description and in a format', async () => {
        const club = { _id: 'c1', name: 'Bullseye' };
        await noteClubTexts(request(), club, { description: 'We meet on Fridays.', formatNames: ['Friday 501'] });
        expect(rules()).toEqual([]);
        await noteClubTexts(request(), club, { description: 'Visit spam.example.com' });
        await noteClubTexts(request(), club, { formatNames: ['www.spam.example'] });
        expect(rules()).toEqual(['linkInText', 'linkInName']);
    });
});

describe('admin takeover', () => {
    it('alerts when an admin made one today removes the others', async () => {
        const req = request();
        const club = { _id: 'c1', name: 'Bullseye', adminSince: [{ user: req.user._id, at: new Date(Date.now() - 2 * HOUR) }] };
        await checkTakeover(req, club, 'removed another admin');
        expect(rules()).toEqual(['adminTakeover']);
        expect(alerts[0].message).toContain('for 2 h, removed another admin');
    });

    it('leaves long-standing admins and the founder alone', async () => {
        const req = request();
        await checkTakeover(req, { _id: 'c1', name: 'Bullseye', adminSince: [{ user: req.user._id, at: new Date(Date.now() - 48 * HOUR) }] }, 'deleted the club');
        await checkTakeover(req, { _id: 'c2', name: 'Founded', adminSince: [] }, 'deleted the club');
        expect(rules()).toEqual([]);
    });
});

describe('deletions', () => {
    it('alerts on much deleted in a short time', async () => {
        const req = request();
        for (let i = 0; i < 20; i += 1) await noteDeleted(req, 'game');
        expect(rules()).toEqual([]);
        await noteDeleted(req, 'player');
        expect(rules()).toEqual(['deleteBurst']);
    });
});

describe('logins and password resets', () => {
    it('alerts on many failed logins for one account', async () => {
        for (let i = 0; i < 11; i += 1) await noteLoginFailure(request({ user: null }), 'anna@example.ch');
        expect(rules()).toEqual(['loginBurst']);
        expect(alerts[0].message).toContain('anna@example.ch');
    });

    it('alerts on many failed logins from one address', async () => {
        const req = request({ user: null });
        for (let i = 0; i < 11; i += 1) await noteLoginFailure(req, `guess${i}@example.ch`);
        expect(rules()).toEqual(['loginBurst']);
        expect(alerts[0].message).toContain(req.ip);
    });

    it('alerts on many password resets', async () => {
        const req = request({ user: null });
        for (let i = 0; i < 6; i += 1) await noteResetRequest(req, 'ben@example.ch');
        expect(rules()).toEqual(['resetBurst']);
    });
});

describe('club badges', () => {
    const badges = (count) => Array.from({ length: count }, (_, i) => ({ badge: `b${i}`, earnedAt: new Date() }));

    it('alerts when a young club earns many badges within a day', async () => {
        await noteClubBadges({ _id: 'c1', name: 'New', createdAt: new Date(Date.now() - 5 * 24 * HOUR), badges: badges(3) }, [{ badge: 'b2' }]);
        expect(rules()).toEqual(['clubBadgeBurst']);
    });

    it('leaves older clubs and a few badges alone', async () => {
        await noteClubBadges({ _id: 'c1', name: 'Old', createdAt: new Date(Date.now() - 400 * 24 * HOUR), badges: badges(5) }, [{ badge: 'b4' }]);
        await noteClubBadges({ _id: 'c2', name: 'New', createdAt: new Date(), badges: badges(2) }, [{ badge: 'b1' }]);
        expect(rules()).toEqual([]);
    });
});

describe('impossible games in a club', () => {
    // a game of Shanghai with a dart that is not on the board
    const impossible = (id) => ({
        _id: id, kind: 'shanghai', settings: {}, players: ['a', 'b'],
        visits: [{ player: 'a', darts: ['T25', 'S1', 'S1'] }],
    });

    it('notes impossible ones and alerts from five on', async () => {
        expect(isImpossible('rules', impossible('g0'))).toBe(true);
        for (let i = 0; i < 4; i += 1) await noteFairPlay('c1', 'rules', impossible(`g${i}`));
        // the same game again counts once
        await noteFairPlay('c1', 'rules', impossible('g0'));
        expect(rules()).toEqual([]);
        await noteFairPlay('c1', 'rules', impossible('g4'));
        expect(rules()).toEqual(['fairPlayImpossible']);
        expect(alerts[0].message).toContain('5 impossible');
    });

    it('leaves possible games out', async () => {
        const game = { _id: 'ok', kind: 'shanghai', settings: {}, players: ['a'], visits: [{ player: 'a', darts: ['S1', 'D1', 'T1'] }] };
        // with the results the API works out from the darts
        await noteFairPlay('c1', 'rules', { ...game, ...withGameState(gameOf('shanghai'), game) });
        expect(hits.size).toBe(0);
    });
});
