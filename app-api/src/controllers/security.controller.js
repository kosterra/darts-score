import { isIP } from 'net';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { LOG_RETENTION_DAYS } from '../models/log.entry.model.js';
import { RULES, CREATE_LIMITS, SIGNUP_LIMIT, IP_BLOCK_HOURS, MIN_FORM_MS } from '../utils/spam.rules.js';
import { blockUser, unblockUser, blockIp } from '../utils/spam.guard.js';

const MAX_ROWS = 500;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// Error log
// ---------------------------------------------------------------------------

/**
 * The latest warnings and errors, newest first. ?level=error|warn, ?search=text
 */
export const logs = async (req, res) => {
    const { level, search } = req.query;
    const query = {};
    if (level === 'error') query.level = { $in: ['error', 'fatal'] };
    else if (level === 'warn') query.level = 'warn';
    if (typeof search === 'string' && search.trim()) {
        const pattern = new RegExp(escapeRegExp(search.trim().slice(0, 100)), 'i');
        query.$or = [{ message: pattern }, { 'error.message': pattern }];
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [entries, errorsToday, warningsToday] = await Promise.all([
        db.logEntry.find(query).sort({ time: -1 }).limit(MAX_ROWS),
        db.logEntry.countDocuments({ level: { $in: ['error', 'fatal'] }, time: { $gte: since } }),
        db.logEntry.countDocuments({ level: 'warn', time: { $gte: since } }),
    ]);
    res.json({ entries, errorsToday, warningsToday, retentionDays: LOG_RETENTION_DAYS, limit: MAX_ROWS });
};

export const clearLogs = async (req, res) => {
    const { deletedCount } = await db.logEntry.deleteMany({});
    logger.info(`Error log cleared by ${req.user.email}`);
    res.json({ deleted: deletedCount });
};

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

/**
 * The rules and their limits, to explain the alerts.
 */
export const rules = (req, res) => res.json({
    rules: Object.entries(RULES).map(([id, rule]) => ({ id, ...rule })),
    limits: { create: CREATE_LIMITS, signup: SIGNUP_LIMIT, ipBlockHours: IP_BLOCK_HOURS, minFormMs: MIN_FORM_MS },
});

/**
 * Alerts, the most recent first. ?status=open|resolved|all (default open)
 */
export const alerts = async (req, res) => {
    const status = ['open', 'resolved', 'all'].includes(req.query.status) ? req.query.status : 'open';
    const list = await db.alert
        .find(status === 'all' ? {} : { status })
        .sort({ lastSeenAt: -1 })
        .limit(MAX_ROWS)
        .populate('user', 'email firstname lastname role blockedAt')
        .populate('club', 'name');
    res.json(list.map(alert => {
        const json = alert.toJSON();
        return {
            ...json,
            rule: { id: alert.rule, title: RULES[alert.rule]?.title ?? alert.rule },
            user: alert.user ? { ...alert.user.toJSON(), id: alert.user._id } : null,
            club: alert.club ? { id: alert.club._id, name: alert.club.name } : null,
        };
    }));
};

/**
 * Open alerts, for the count in the menu.
 */
export const alertSummary = async (req, res) => {
    const [open, critical] = await Promise.all([
        db.alert.countDocuments({ status: 'open' }),
        db.alert.countDocuments({ status: 'open', severity: 'critical' }),
    ]);
    res.json({ open, critical });
};

const setStatus = (status) => async (req, res) => {
    const alert = await db.alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    Object.assign(alert, status === 'resolved'
        ? { status, resolvedAt: new Date(), resolvedBy: req.user.email }
        : { status, resolvedAt: null, resolvedBy: '' });
    await alert.save();
    res.json({ id: alert._id, status: alert.status });
};

export const resolveAlert = setStatus('resolved');
export const reopenAlert = setStatus('open');

export const resolveAllAlerts = async (req, res) => {
    const { modifiedCount } = await db.alert.updateMany(
        { status: 'open' },
        { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user.email }
    );
    res.json({ resolved: modifiedCount });
};

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * Blocked accounts and addresses.
 */
export const blocks = async (req, res) => {
    const [users, ips] = await Promise.all([
        db.user.find({ blockedAt: { $ne: null } }).sort({ blockedAt: -1 }),
        db.blockedIp.find({ $or: [{ until: null }, { until: { $gt: new Date() } }] }).sort({ createdAt: -1 }),
    ]);
    res.json({ users, ips });
};

export const blockAccount = async (req, res) => {
    const user = await db.user.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === ROLES.GLOBAL_ADMIN) return res.status(422).json({ message: 'Global admins cannot be blocked.' });
    await blockUser(user, req.body.reason?.trim() || `Blocked by ${req.user.email}`);
    res.json(user);
};

export const unblockAccount = async (req, res) => {
    const user = await db.user.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await unblockUser(user);
    logger.info(`User ${user.email} unblocked by ${req.user.email}`);
    res.json(user);
};

export const blockAddress = async (req, res) => {
    const ip = String(req.body.ip ?? '').trim();
    if (!isIP(ip)) return res.status(422).json({ message: 'This is not an internet address (IPv4 or IPv6).' });
    const hours = Number(req.body.hours) > 0 ? Number(req.body.hours) : null;
    await blockIp(ip, req.body.reason?.trim() || `Blocked by ${req.user.email}`, { hours, blockedBy: req.user.email });
    res.status(201).json(await db.blockedIp.findOne({ ip }));
};

export const unblockAddress = async (req, res) => {
    const { deletedCount } = await db.blockedIp.deleteOne({ _id: req.params.id });
    if (!deletedCount) return res.status(404).json({ message: 'Block not found.' });
    res.json({ deleted: true });
};
