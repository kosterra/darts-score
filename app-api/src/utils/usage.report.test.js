import { describe, expect, it, vi, beforeEach } from 'vitest';

// the global admins, what was noted as sent, and the mails
let admins = [];
const sentKeys = new Set();
const mails = [];
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        user: { find: () => ({ lean: async () => admins }) },
        noticeSent: { create: async ({ key }) => { if (sentKeys.has(key)) { const err = new Error('dup'); err.code = 11000; throw err; } sentKeys.add(key); } },
    },
}));
vi.mock('./mail.service.js', () => ({ sendTemplateMail: async (id, to, vars, language) => { mails.push({ id, to, vars, language }); } }));
vi.mock('./mail.utils.js', () => ({ getAppUrl: () => 'https://oche.example.com', isMailConfigured: () => true }));
vi.mock('./usage.stats.js', () => ({
    lastWeeks: async () => ({
        week: { start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) },
        before: {},
    }),
    usageLines: (week, before, language) => [`• ${language} line`],
}));

const { sendUsageReports } = await import('./notification.jobs.js');
const monday = new Date(2026, 9, 19, 8, 0);

beforeEach(() => { admins = []; sentKeys.clear(); mails.length = 0; });

describe('the weekly usage report', () => {
    it('goes to every global admin who keeps it on, once a week, in their language', async () => {
        admins = [
            { _id: 'a1', email: 'anna@example.ch', firstname: 'Anna', language: 'de' },
            { _id: 'a2', email: 'lex@example.ch', firstname: 'Lex', language: 'en', notifications: { usageReport: { mail: 'off' } } },
        ];
        expect(await sendUsageReports(monday)).toBe(1);
        expect(mails).toHaveLength(1);
        expect(mails[0]).toMatchObject({ id: 'usageReport', to: 'anna@example.ch', language: 'de' });
        expect(mails[0].vars).toMatchObject({ firstname: 'Anna', week: '12.10.2026 – 18.10.2026', summary: '• de line', link: 'https://oche.example.com/admin/usage' });
        // the hourly job runs again that Monday: nothing more
        expect(await sendUsageReports(new Date(2026, 9, 19, 9, 0))).toBe(0);
    });
});
