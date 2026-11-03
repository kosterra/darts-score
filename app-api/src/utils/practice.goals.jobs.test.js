import { describe, expect, it, vi, beforeEach } from 'vitest';

// the users with goals, how far their goals are, what was noted as sent, and what was told
let users = [];
let progress = {};
const sentKeys = new Set();
const notices = [];
const closed = [];
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        mongoose: { isValidObjectId: () => true },
        user: { find: () => ({ lean: async () => users }) },
        noticeSent: { create: async ({ key }) => { if (sentKeys.has(key)) { const err = new Error('dup'); err.code = 11000; throw err; } sentKeys.add(key); } },
    },
}));
vi.mock('./notify.js', () => ({
    deliverQuietly: async (list) => { notices.push(...list); return list; },
    // the weekly mails are due from 7 o'clock
    digestDue: (period, last, now) => now.getHours() >= 7,
    languageOf: vi.fn(), mailContact: vi.fn(), sendDigests: vi.fn(), unsubscribeToken: vi.fn(),
}));
vi.mock('./mail.utils.js', () => ({ getAppUrl: () => 'https://legmate.example', isMailConfigured: () => true }));
vi.mock('./practice.goals.js', async (importOriginal) => ({
    ...(await importOriginal()),
    weekProgress: async (user, now) => ({ week: { key: '2026-11-02' }, goals: progress[user._id] ?? [], now }),
    closePracticeWeeks: async (now) => { closed.push(now); return 1; },
}));

const { remindPracticeGoals, closePracticeWeeksDue, PRACTICE_NUDGE_HOUR } = await import('./notification.jobs.js');
const { goalView } = await import('./practice.goals.js');

// Sunday 8 November 2026, the last day of the week of 2 November
const sunday = (hours) => new Date(2026, 10, 8, hours);

beforeEach(() => {
    users = [{ _id: 'u1', practiceGoals: [{ id: 'g1' }] }, { _id: 'u2', practiceGoals: [{ id: 'g2' }] }];
    progress = {
        u1: [goalView({ id: 'g1', kind: 'trainings', target: 3 }, 2)],
        u2: [goalView({ id: 'g2', kind: 'games', target: 1 }, 4)],
    };
    sentKeys.clear();
    notices.length = 0;
    closed.length = 0;
});

describe('the nudge of the weekly goals', () => {
    it('comes on Sunday from 10:00, once, to who has a goal still open', async () => {
        await remindPracticeGoals(sunday(PRACTICE_NUDGE_HOUR));
        expect(notices).toEqual([{ user: 'u1', kind: 'practiceGoalNudge', title: 'Your week ends today: 3 trainings stands at 2 of 3', body: 'There is still time for a training.', link: '/profile#playing' }]);
        await remindPracticeGoals(sunday(PRACTICE_NUDGE_HOUR + 3));
        expect(notices).toHaveLength(1);
    });

    it('not before 10:00, not on other days', async () => {
        await remindPracticeGoals(sunday(9));
        await remindPracticeGoals(new Date(2026, 10, 7, 12));
        await remindPracticeGoals(new Date(2026, 10, 9, 12));
        expect(notices).toHaveLength(0);
    });

    it('not when all goals are reached', async () => {
        progress.u1 = [goalView({ id: 'g1', kind: 'trainings', target: 3 }, 3)];
        await remindPracticeGoals(sunday(11));
        expect(notices).toHaveLength(0);
    });

    it('not for who turned it off', async () => {
        users[0].notifications = { practiceGoalNudge: { inApp: false, mail: 'off' } };
        await remindPracticeGoals(sunday(11));
        expect(notices).toHaveLength(0);
        expect(sentKeys.size).toBe(0);
    });
});

describe('the week that ended', () => {
    it('is closed from the hour of the weekly mails on', async () => {
        expect(await closePracticeWeeksDue(new Date(2026, 10, 9, 6))).toBe(0);
        expect(closed).toHaveLength(0);
        expect(await closePracticeWeeksDue(new Date(2026, 10, 9, 7))).toBe(1);
        expect(closed).toEqual([new Date(2026, 10, 9, 7)]);
    });
});
