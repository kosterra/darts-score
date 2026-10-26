import { describe, it, expect, vi, beforeEach } from 'vitest';

let state;
vi.mock('../models/db.model.js', () => ({ default: { user: { find: () => ({ lean: async () => state.users }) } } }));
vi.mock('./mail.utils.js', () => ({
    getAppUrl: () => state.appUrl,
    isMailConfigured: () => state.mail,
    mailServerCheck: () => state.mailCheck,
}));
vi.mock('./mfa.js', () => ({ secretReadable: (user) => user.readable }));
vi.mock('./backups.js', () => ({
    BACKUP_DIR: '/nowhere/backups',
    listBackups: async () => state.backups,
    getBackupSettings: async () => state.schedule,
}));
vi.mock('./legal.settings.js', () => ({ getLegalSettings: async () => state.legal }));
vi.mock('./start.page.settings.js', () => ({ getStartPageSettings: async () => ({ publicSite: state.publicSite }) }));
// the disks: the backups on a device of their own (or not), and how much space is free
vi.mock('node:fs/promises', () => ({ default: {
    stat: async (dir) => ({ dev: dir.includes('backups') ? state.backupDevice : 1 }),
    statfs: async () => ({ bsize: 4096, blocks: 100 * 262144, bavail: state.freeGb * 262144 }),
} }));

const { installationCheck } = await import('./installation.check.js');
const NOW = new Date('2026-10-26T12:00:00Z');
const ids = async () => (await installationCheck(NOW)).problems.map(problem => problem.id);

beforeEach(() => {
    process.env.SESSION_SECRET = 'secret';
    process.env.MFA_KEY = 'key';
    process.env.SMTP_FROM = 'Legmate <darts@example.ch>';
    state = {
        appUrl: 'https://legmate.example', mail: true, mailCheck: { ok: true }, users: [{ readable: true }],
        backups: [{ createdAt: new Date('2026-10-25T03:00:00Z') }], schedule: { enabled: true, lastError: null },
        legal: { operator: 'Club', email: 'info@example.ch' }, publicSite: true,
        backupDevice: 2, freeGb: 40,
    };
});

describe('the installation check', () => {
    it('finds nothing on a well set up installation', async () => {
        expect(await ids()).toEqual([]);
    });

    it('names what is missing in the environment, the worst first', async () => {
        state.appUrl = '';
        delete process.env.MFA_KEY;
        delete process.env.SMTP_FROM;
        const { problems } = await installationCheck(NOW);
        expect(problems.map(problem => problem.id)).toEqual(['appUrl', 'mail', 'mfaKey']);
        expect(problems[0]).toMatchObject({ level: 'bad', fix: { env: 'APP_URL' } });
    });

    it('tells when the mail server refuses the login', async () => {
        state.mailCheck = { ok: false, error: { message: 'The mail server refused the login. Check SMTP_USER and SMTP_PASSWORD.' } };
        const { problems } = await installationCheck(NOW);
        expect(problems).toEqual([expect.objectContaining({ id: 'mail', level: 'bad', detail: expect.stringMatching(/SMTP_USER/) })]);
    });

    it('counts the accounts whose two-step login MFA_KEY no longer opens', async () => {
        state.users = [{ readable: false }, { readable: false }, { readable: true }];
        const { problems } = await installationCheck(NOW);
        expect(problems[0]).toMatchObject({ id: 'mfaKey', level: 'bad', detail: expect.stringMatching(/^2 accounts/) });
    });

    it('wants a backup of the last week, and says when the automatic one failed', async () => {
        state.backups = [{ createdAt: new Date('2026-10-10T03:00:00Z') }];
        expect(await ids()).toEqual(['backups']);
        state.schedule = { enabled: true, lastError: 'ENOSPC: no space left on device' };
        expect((await installationCheck(NOW)).problems[0]).toMatchObject({ level: 'bad', detail: 'ENOSPC: no space left on device' });
    });

    it('asks for the operator only where the start page is public', async () => {
        state.legal = { operator: '', email: '' };
        expect(await ids()).toEqual(['operator']);
        state.publicSite = false;
        expect(await ids()).toEqual([]);
    });

    it('wants the backups on a disk of their own, and enough space', async () => {
        state.backupDevice = 1;
        expect(await ids()).toEqual(['backupDisk']);
        state.backupDevice = 2;
        state.freeGb = 0.5;
        const { problems } = await installationCheck(NOW);
        expect(problems).toEqual([expect.objectContaining({ id: 'diskSpace', detail: 'Only 0.5 GB of 100.0 GB are free on the disk of the data and the backups.' })]);
    });
});
