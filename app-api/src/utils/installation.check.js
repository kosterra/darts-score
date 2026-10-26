import fsp from 'node:fs/promises';
import path from 'node:path';
import db from '../models/db.model.js';
import { getAppUrl, isMailConfigured, mailServerCheck } from './mail.utils.js';
import { secretReadable } from './mfa.js';
import { BACKUP_DIR, getBackupSettings, listBackups } from './backups.js';
import { getLegalSettings } from './legal.settings.js';
import { getStartPageSettings } from './start.page.settings.js';

/**
 * What could go wrong with the installation, before it hurts: the settings
 * of its environment, the mail server, two-step login, the backups, the disk
 * and the privacy page. Each problem: { id, level: 'bad' | 'warn', title,
 * detail, fix: { to } (a page of the app) or { env } (a setting of the
 * server) }. Only problems are listed, with how many checks ran.
 */

const DAY = 24 * 60 * 60 * 1000;
const GB = 1024 ** 3;
const IMG_DIR = path.resolve(process.env.IMG_DIR || 'data/img');
const gb = (bytes) => (bytes / GB).toFixed(1);

// the device a folder lies on (the nearest one that exists), or null
const deviceOf = async (dir) => {
    for (let current = dir; ; current = path.dirname(current)) {
        try {
            return (await fsp.stat(current)).dev;
        } catch {
            if (path.dirname(current) === current) return null;
        }
    }
};

const CHECKS = {
    appUrl: async () => (getAppUrl() ? null : {
        level: 'bad',
        title: 'APP_URL is not set',
        detail: 'Links in mails and the previews of shared links do not work. Set APP_URL to the public address of the installation, e.g. https://legmate.example.',
        fix: { env: 'APP_URL' },
    }),

    sessionSecret: async () => (process.env.SESSION_SECRET ? null : {
        level: 'bad',
        title: 'SESSION_SECRET is not set',
        detail: 'Every restart logs everyone out. Set SESSION_SECRET to a long random value and keep it.',
        fix: { env: 'SESSION_SECRET' },
    }),

    mail: async () => {
        if (!isMailConfigured()) {
            return {
                level: 'warn',
                title: 'Mail is not set up',
                detail: 'Nobody can reset a forgotten password by mail, and invitations and notifications by mail are off. Set SMTP_HOST and the other SMTP settings.',
                fix: { env: 'SMTP_HOST' },
            };
        }
        const check = mailServerCheck();
        if (check && !check.ok) {
            return {
                level: 'bad',
                title: 'The mail server refuses the mails',
                detail: check.error?.message ?? 'The mail could not be sent. Check the mail settings of the installation.',
                fix: { to: '/system-settings#mail-server' },
            };
        }
        if (!process.env.SMTP_FROM) {
            return {
                level: 'warn',
                title: 'SMTP_FROM is not set',
                detail: 'Mails go out from no-reply@darts-score.local, which many mail servers refuse. Set SMTP_FROM, e.g. Legmate <darts@example.com>.',
                fix: { env: 'SMTP_FROM' },
            };
        }
        return null;
    },

    mfaKey: async () => {
        const users = await db.user.find({ 'mfa.enabledAt': { $ne: null } }, 'mfa').lean();
        const lost = users.filter(user => !secretReadable(user)).length;
        if (lost) {
            return {
                level: 'bad',
                title: 'Two-step login does not match MFA_KEY',
                detail: lost === 1
                    ? '1 account can only log in with a recovery code. Put the old MFA_KEY back, or it sets up two-step login again.'
                    : `${lost} accounts can only log in with a recovery code. Put the old MFA_KEY back, or they set up two-step login again.`,
                fix: { env: 'MFA_KEY' },
            };
        }
        return process.env.MFA_KEY ? null : {
            level: 'warn',
            title: 'MFA_KEY is not set',
            detail: 'The secrets of two-step login are encrypted with a key from SESSION_SECRET: changing that secret ends every two-step login. Set MFA_KEY once and keep it.',
            fix: { env: 'MFA_KEY' },
        };
    },

    backups: async (now) => {
        const [backups, schedule] = await Promise.all([listBackups(), getBackupSettings()]);
        if (schedule.enabled && schedule.lastError) {
            return { level: 'bad', title: 'The last automatic backup failed', detail: schedule.lastError, fix: { to: '/admin/backups' } };
        }
        if (!backups.length) {
            return { level: 'warn', title: 'No backup yet', detail: 'Back up now, or switch on automatic backups.', fix: { to: '/admin/backups' } };
        }
        if (now - new Date(backups[0].createdAt) > 8 * DAY) {
            return { level: 'warn', title: 'No backup for more than a week', detail: 'Back up now, or switch on automatic backups.', fix: { to: '/admin/backups' } };
        }
        return null;
    },

    backupDisk: async () => {
        const [backups, data] = await Promise.all([deviceOf(BACKUP_DIR), deviceOf(IMG_DIR)]);
        return backups == null || backups !== data ? null : {
            level: 'warn',
            title: 'The backups lie on the same disk as the data',
            detail: 'A broken disk takes both. Mount another disk or a network share (e.g. NFS) at /app/data/backups, or download a backup now and then.',
            fix: { to: '/admin/backups' },
        };
    },

    diskSpace: async () => {
        let stats;
        try {
            stats = await fsp.statfs(BACKUP_DIR);
        } catch {
            try { stats = await fsp.statfs(path.dirname(IMG_DIR)); } catch { return null; }
        }
        const free = stats.bavail * stats.bsize;
        const total = stats.blocks * stats.bsize;
        return free >= GB && free >= total * 0.1 ? null : {
            level: 'warn',
            title: 'Little space left on the disk',
            detail: `Only ${gb(free)} GB of ${gb(total)} GB are free on the disk of the data and the backups.`,
            fix: { to: '/admin/backups' },
        };
    },

    operator: async () => {
        const [{ publicSite }, legal] = await Promise.all([getStartPageSettings(), getLegalSettings()]);
        return !publicSite || (legal.operator && legal.email) ? null : {
            level: 'warn',
            title: 'The privacy page names no operator',
            detail: 'Enter who runs the installation and a contact email under System settings → Privacy and imprint.',
            fix: { to: '/system-settings' },
        };
    },
};

/**
 * Runs every check (one failing is skipped): { problems: [...], checked }.
 */
export const installationCheck = async (now = new Date()) => {
    const results = await Promise.all(Object.entries(CHECKS).map(async ([id, check]) => {
        try {
            const problem = await check(now);
            return problem ? { id, ...problem } : null;
        } catch {
            return null;
        }
    }));
    const problems = results.filter(Boolean).sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1));
    return { problems, checked: Object.keys(CHECKS).length };
};
