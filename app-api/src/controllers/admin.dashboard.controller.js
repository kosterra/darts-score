import db from '../models/db.model.js';
import { installationNumbers } from './public.controller.js';
import { mailDays } from '../utils/mail.limit.js';
import { isMailConfigured } from '../utils/mail.utils.js';
import { getBackupSettings, listBackups, nextDueAt } from '../utils/backups.js';
import { installationCheck } from '../utils/installation.check.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * What the global admins see first: the installation in numbers, who is
 * using it now and this week, what wants their attention (open alerts,
 * errors of the last day), the mails of today against the limit, and the
 * backups (the newest, the schedule, a failed one), and what is wrong with
 * the installation (see installationCheck).
 */
export const dashboard = async (req, res) => {
    const now = new Date();
    const weekKeys = Array.from({ length: 7 }, (_, back) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [numbers, users, usersNew, sessions, week, alerts, errors, quickGames, mail, backups, schedule, health] = await Promise.all([
        installationNumbers(),
        db.user.countDocuments(),
        db.user.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY) } }),
        db.session.find({ expiresAt: { $gt: now } }, 'user').lean(),
        db.usageDay.find({ day: { $in: weekKeys } }, 'users').lean(),
        db.alert.aggregate([{ $match: { status: 'open' } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
        db.logEntry.countDocuments({ level: { $in: ['error', 'fatal'] }, time: { $gte: new Date(now - DAY) } }),
        db.quickGame.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY) } }),
        mailDays(1, now),
        listBackups(),
        getBackupSettings(),
        installationCheck(now),
    ]);
    const open = Object.fromEntries(alerts.map(entry => [entry._id, entry.count]));
    res.json({
        numbers: { ...numbers, users, usersNew, quickGames },
        now: { sessions: sessions.length, users: new Set(sessions.map(entry => String(entry.user))).size },
        week: { users: new Set(week.flatMap(entry => entry.users.map(String))).size },
        attention: { critical: open.critical ?? 0, warning: open.warning ?? 0, errors },
        mail: { configured: isMailConfigured(), today: mail.days[0]?.mails ?? 0, limit: mail.limit },
        backups: {
            latest: backups[0] ?? null,
            count: backups.length,
            enabled: schedule.enabled,
            nextAt: schedule.enabled ? nextDueAt(schedule, now) : null,
            lastError: schedule.lastError,
        },
        health,
    });
};
