import { describe, it, expect, vi, beforeEach } from 'vitest';

// the notifications stored and the mails sent, in memory
const stored = [];
const mails = [];
const users = new Map();
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('./mail.utils.js', () => ({ getAppUrl: () => 'https://oche.example', isMailConfigured: () => true, sendMail: vi.fn() }));
vi.mock('./mail.service.js', () => ({ sendTemplateMail: async (id, to, vars, language, options) => { mails.push({ id, to, vars, language, options }); return true; } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        mongoose: { isValidObjectId: (id) => /^[0-9a-f]{24}$/.test(String(id)) },
        user: {
            find: (query) => ({ lean: async () => query._id.$in.map(id => users.get(String(id))).filter(Boolean) }),
            findById: async (id) => users.get(String(id)) ?? null,
            updateOne: async () => {},
        },
        notification: {
            create: async (doc) => { const created = { ...doc, save: async () => {} }; stored.push(created); return created; },
        },
    },
}));

const { deliver, digestDue, readUnsubscribeToken, unsubscribeToken, unsubscribe } = await import('./notify.js');
const { normalizePreferences, preferenceOf, topicOfKind } = await import('../rules/notifications.js');
const { translate, tr } = await import('./translate.js');
const { progressNotices, ratingMoves } = await import('./player.notices.js');
const { clubRatings } = await import('./compare.js');

const ANNA = 'a'.repeat(24);
const BEN = 'b'.repeat(24);

beforeEach(() => {
    stored.length = 0;
    mails.length = 0;
    users.clear();
    users.set(ANNA, { _id: ANNA, email: 'anna@example.ch', firstname: 'Anna', language: 'de', notifications: undefined });
    users.set(BEN, { _id: BEN, email: 'ben@example.ch', firstname: 'Ben', language: null, notifications: { joinRequests: { inApp: false, mail: 'daily' }, badges: { inApp: false, mail: 'off' } } });
});

describe('the topics', () => {
    it('take the defaults until the user chooses', () => {
        expect(preferenceOf(undefined, 'joinRequests')).toEqual({ inApp: true, mail: 'instant' });
        expect(preferenceOf({ joinRequests: { mail: 'weekly' } }, 'joinRequests')).toEqual({ inApp: true, mail: 'weekly' });
        expect(preferenceOf(undefined, 'rating')).toEqual({ inApp: false, mail: 'off' });
    });

    it('keep security always on', () => {
        expect(preferenceOf({ security: { inApp: false, mail: 'off' } }, 'security')).toEqual({ inApp: true, mail: 'instant' });
        expect(normalizePreferences({ security: { mail: 'off' } })).toEqual({});
    });

    it('keep only known topics and choices', () => {
        expect(normalizePreferences({ badges: { inApp: false, mail: 'daily' }, nonsense: { mail: 'daily' }, level: { mail: 'hourly' }, weeklySummary: { inApp: true, mail: 'instant' } }))
            .toEqual({ badges: { inApp: false, mail: 'daily' } });
        expect(normalizePreferences({ weeklySummary: { mail: 'weekly' } })).toEqual({ weeklySummary: { mail: 'weekly' } });
        expect(normalizePreferences(null)).toEqual({});
    });

    it('know the topic of every kind', () => {
        expect(topicOfKind('joinRequested').id).toBe('joinRequests');
        expect(topicOfKind('fairPlayRestored').id).toBe('fairPlay');
        expect(topicOfKind('unknown')).toBeNull();
    });
});

describe('delivering', () => {
    const request = (user) => ({ user, kind: 'joinRequested', title: 'Ben Muster asks to join Test Club', body: 'Accept or decline the request.', link: '/my-clubs/c1' });

    it('mails at once in the language of the user, with the way to manage the notifications', async () => {
        await deliver([request(ANNA)]);
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({ inApp: true, mail: 'instant' });
        expect(mails).toHaveLength(1);
        expect(mails[0]).toMatchObject({ id: 'notification', to: 'anna@example.ch', language: 'de' });
        expect(mails[0].vars.title).toBe('Ben Muster bittet um Beitritt zu Test Club');
        expect(mails[0].vars.link).toBe('https://oche.example/my-clubs/c1');
        expect(mails[0].vars.manageUrl).toBe('https://oche.example/profile#notifications');
        expect(mails[0].options.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    });

    it('keeps one for the mail of the day, out of the center, as chosen', async () => {
        await deliver([request(BEN)]);
        expect(stored[0]).toMatchObject({ inApp: false, mail: 'daily' });
        expect(mails).toHaveLength(0);
    });

    it('leaves out what the user turned off entirely', async () => {
        await deliver([{ user: BEN, kind: 'badgeEarned', title: 'You earned the badge Ton 80' }]);
        expect(stored).toHaveLength(0);
    });

    it('sends no mails to a blocked account', async () => {
        users.get(ANNA).blockedAt = new Date();
        await deliver([request(ANNA)]);
        expect(stored[0].mail).toBe('off');
        expect(mails).toHaveLength(0);
    });
});

describe('the mails of the day and the week', () => {
    const at = (day, hour) => new Date(2026, 9, day, hour);

    it('go out from seven in the morning, once a day', () => {
        expect(digestDue('daily', null, at(21, 6))).toBe(false);
        expect(digestDue('daily', null, at(21, 7))).toBe(true);
        expect(digestDue('daily', at(21, 7), at(21, 9))).toBe(false);
        expect(digestDue('daily', at(20, 7), at(21, 9))).toBe(true);
    });

    it('go out once a week from Monday', () => {
        // 19.10.2026 is a Monday
        expect(digestDue('weekly', at(19, 8), at(24, 9))).toBe(false);
        expect(digestDue('weekly', at(18, 8), at(24, 9))).toBe(true);
    });
});

describe('unsubscribe links', () => {
    it('carry who and what, and refuse a changed one', () => {
        const token = unsubscribeToken('user', ANNA, 'badges');
        expect(readUnsubscribeToken(token)).toEqual({ type: 'user', id: ANNA, topic: 'badges' });
        expect(readUnsubscribeToken(`${token}x`)).toBeNull();
        expect(readUnsubscribeToken(token.replace(/^./, 'x'))).toBeNull();
        expect(readUnsubscribeToken('nonsense')).toBeNull();
    });

    it('turn the mails off, all of them or one topic', async () => {
        const anna = users.get(ANNA);
        anna.markModified = () => {};
        anna.save = async () => {};
        await unsubscribe(unsubscribeToken('user', ANNA, 'badges'));
        expect(anna.notifications.badges).toEqual({ mail: 'off' });
        await unsubscribe(unsubscribeToken('user', ANNA, 'all'));
        expect(anna.notifications.joinRequests).toEqual({ mail: 'off' });
        expect(anna.notifications.security).toBeUndefined();
    });
});

describe('translating the texts of the API', () => {
    it('finds a text as it is or as a pattern, and leaves names alone', () => {
        expect(translate('de', 'Many failed logins')).toBe('Viele fehlgeschlagene Logins');
        expect(translate('fr', 'Anna Muster asks to join Test Club')).toBe('Anna Muster demande à rejoindre Test Club');
        expect(translate('de', 'Sammy')).toBe('Sammy');
        expect(translate('en', 'Many failed logins')).toBe('Many failed logins');
        expect(tr('it', 'Trainings: {{count}}', { count: 3 })).toBe('Allenamenti: 3');
    });
});

describe("the notices of a player's progress", () => {
    const player = { _id: 'p1', nickname: 'Sammy', clubs: ['c1'] };

    it('tell the new badges, the Hall of Shame and a new level', () => {
        const notices = progressNotices(player, {
            fresh: [{ badge: 'games-1' }],
            shameBefore: [{ badge: 'bedAndBreakfast', sourceId: 'g1' }],
            shameAfter: [{ badge: 'bedAndBreakfast', sourceId: 'g1' }, { badge: 'madhouse', sourceId: 'g2' }],
            washesBefore: [],
            washesAfter: [{ badge: 'bedAndBreakfast', sourceId: 'g3' }],
            level: { index: 3, name: 'Club Regular' },
        });
        expect(notices.map(notice => notice.kind)).toEqual(['badgeEarned', 'shameGot', 'shameWashed', 'levelUp']);
        expect(notices[0].contactTitle).toMatch(/^Sammy earned the badge /);
        expect(notices[1].title).toBe('You landed in the Hall of Shame: Madhouse');
        expect(notices[3]).toMatchObject({ title: 'You are now a Club Regular', link: '/me' });
    });

    it('say nothing when nothing changed', () => {
        expect(progressNotices(player, { shameBefore: [{ badge: 'madhouse', sourceId: 'g2' }], shameAfter: [{ badge: 'madhouse', sourceId: 'g2' }] })).toEqual([]);
    });
});

describe('the club rating', () => {
    // A beat B five times, C beat D five times: A, C ahead of B, D; then D beats A once and twice more
    const tally = (id, winner, loser, at) => ({ sourceId: id, players: [winner, loser], winners: [winner], at: new Date(2026, 9, at) });
    const base = [
        ...[1, 2, 3, 4, 5].map(n => tally(`ab${n}`, 'A', 'B', n)),
        ...[1, 2, 3, 4, 5].map(n => tally(`cd${n}`, 'C', 'D', n)),
        ...[1, 2, 3, 4, 5].map(n => tally(`ad${n}`, 'A', 'D', 5 + n)),
    ];

    it('tells who moved up past whom', () => {
        const wins = (count) => [...base, ...Array.from({ length: count }, (_, index) => tally(`da${index + 1}`, 'D', 'A', 11 + index))];
        // the third win lifts D past B, the sixth past A
        expect(ratingMoves(wins(3), 'da3', { clubRatings, minGames: 5 })).toMatchObject({ climbed: [{ id: 'D', place: 3, passed: ['B'] }] });
        expect([...ratingMoves(wins(6), 'da6', { clubRatings, minGames: 5 }).passedBy]).toEqual([['A', ['D']]]);
        // a win that changes no places tells nobody
        expect(ratingMoves(wins(4), 'da4', { clubRatings, minGames: 5 }).climbed).toEqual([]);
    });

    it('leaves friendly games and games without one winner out', () => {
        expect(ratingMoves([...base, { ...tally('f', 'D', 'A', 20), friendly: true }], 'f', { clubRatings, minGames: 5 }).climbed).toEqual([]);
        expect(ratingMoves([...base, { sourceId: 'x', players: ['A', 'D'], winners: [] }], 'x', { clubRatings, minGames: 5 }).climbed).toEqual([]);
    });
});
