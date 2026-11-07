import { describe, expect, it, vi, beforeEach } from 'vitest';

// the days of use, the limit, and what the global admins were told, in memory
let days = new Map();
let limit = 300;
const told = [];
const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => (value === null ? doc[key] == null : doc[key] === value));
const apply = (doc, update) => {
    for (const [key, value] of Object.entries(update.$inc ?? {})) doc[key] = (doc[key] ?? 0) + value;
    Object.assign(doc, update.$set ?? {});
};
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        setting: { findOne: () => ({ lean: async () => ({ value: { perDay: limit } }) }), updateOne: async (filter, update) => { limit = update.$set.value.perDay; } },
        user: { find: () => ({ lean: async () => [{ _id: 'admin' }] }) },
        usageDay: {
            findOne: ({ day }) => ({ lean: async () => days.get(day) ?? null }),
            findOneAndUpdate: ({ day }, update) => ({
                lean: async () => {
                    const doc = days.get(day) ?? { day };
                    apply(doc, update);
                    days.set(day, doc);
                    return doc;
                },
            }),
            updateOne: async (filter, update, options = {}) => {
                const doc = days.get(filter.day);
                if (doc && matches(doc, filter)) { apply(doc, update); return { modifiedCount: 1 }; }
                if (doc) { if (options.upsert) { const err = new Error('dup'); err.code = 11000; throw err; } return { modifiedCount: 0 }; }
                if (!options.upsert) return { modifiedCount: 0 };
                const created = { day: filter.day };
                apply(created, update);
                days.set(filter.day, created);
                return { upsertedCount: 1 };
            },
        },
    },
}));
vi.mock('./notify.js', () => ({ deliverQuietly: async (notices) => { told.push(...notices.map(notice => notice.kind)); } }));

const { checkMailLimit, countMail, isLimitRefusal, noteLimitRefusal, saveMailLimit } = await import('./mail.limit.js');
const { toLogEntry } = await import('./error.log.js');

const now = new Date(2026, 9, 24, 12, 0);
const send = async (count) => {
    for (let index = 0; index < count; index += 1) {
        await checkMailLimit(now);
        await countMail(now);
    }
};

beforeEach(() => { days = new Map(); limit = 300; told.length = 0; });

describe('the daily mail limit', () => {
    it('tells the global admins once when it is close and once when it is reached', async () => {
        await send(239);
        expect(told).toEqual([]);
        await send(1);
        expect(told).toEqual(['mailLimitNear']);
        await send(59);
        expect(told).toEqual(['mailLimitNear']);
        await send(1);
        expect(told).toEqual(['mailLimitNear', 'mailLimitReached']);
    });

    it('holds back the mails of the rest of the day once it is reached, and counts them', async () => {
        await send(300);
        await expect(checkMailLimit(now)).rejects.toMatchObject({ code: 'ELIMIT' });
        await expect(checkMailLimit(now)).rejects.toMatchObject({ code: 'ELIMIT' });
        expect(days.get('2026-10-24')).toMatchObject({ mails: 300, mailsHeldBack: 2, mailLimit: 300 });
        // the next day starts again
        await expect(checkMailLimit(new Date(2026, 9, 25, 7, 0))).resolves.toBeUndefined();
    });

    it('counts as reached when the mail server refuses mails for a limit of its own', async () => {
        limit = null;
        await send(12);
        const refused = { responseCode: 550, response: '550 5.4.6 Daily sending quota exceeded' };
        expect(isLimitRefusal(refused)).toBe(true);
        expect(isLimitRefusal({ responseCode: 550, response: '550 No such user' })).toBe(false);
        expect(await noteLimitRefusal(refused, now)).toBe(true);
        expect(told).toEqual(['mailLimitReached']);
        await expect(checkMailLimit(now)).rejects.toMatchObject({ code: 'ELIMIT' });
    });

    it('keeps a mail held back out of the errors of the app', () => {
        const line = (code) => JSON.stringify({ severity: 'ERROR', msg: 'Failed to send', err: { type: 'Error', message: 'x', code } });
        expect(toLogEntry(line('ELIMIT')).level).toBe('warn');
        expect(toLogEntry(line('EAUTH')).level).toBe('error');
    });

    // last: saving the limit keeps it in the cache of the module
    it('lets mails go out again the same day when it is raised or removed, not when it stays below the mails sent', async () => {
        await saveMailLimit(300, now);
        await send(300);
        await expect(checkMailLimit(now)).rejects.toMatchObject({ code: 'ELIMIT' });
        // lowered: still reached
        await saveMailLimit(200, now);
        await expect(checkMailLimit(now)).rejects.toMatchObject({ code: 'ELIMIT' });
        // raised: today follows it, and the admins hear again when it is close
        await saveMailLimit(400, now);
        await expect(checkMailLimit(now)).resolves.toBeUndefined();
        expect(days.get('2026-10-24')).toMatchObject({ mailLimit: 400, mailLimitReachedAt: null, mailLimitNearAt: null });
        told.length = 0;
        await send(100);
        expect(told).toEqual(['mailLimitNear', 'mailLimitReached']);
        await expect(checkMailLimit(now)).rejects.toMatchObject({ code: 'ELIMIT' });
        // removed: no limit at all
        await saveMailLimit(null, now);
        await expect(checkMailLimit(now)).resolves.toBeUndefined();
        await send(50);
        expect(days.get('2026-10-24')).toMatchObject({ mails: 450, mailLimitReachedAt: null });
    });
});
