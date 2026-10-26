import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { NOTIFICATION_TOPICS, normalizePreferences, preferenceOf } from '../rules/notifications.js';
import { isMailConfigured } from '../utils/mail.utils.js';
import { readUnsubscribeToken, unsubscribe as turnOff } from '../utils/notify.js';
import { isGlobalAdmin } from '../middleware/auth.middleware.js';

// the notifications of the center: not those only meant for the mails
const IN_CENTER = { inApp: { $ne: false } };

const view = (notice) => ({
    id: String(notice._id),
    kind: notice.kind,
    title: notice.title,
    body: notice.body ?? '',
    link: notice.link ?? null,
    club: notice.club ? String(notice.club) : null,
    byName: notice.byName ?? '',
    at: notice.createdAt,
    read: Boolean(notice.readAt),
});

/**
 * The newest notifications of the user, with how many are unread:
 * { notifications, unread }.
 */
export const findMine = async (req, res) => {
    try {
        const [notices, unread] = await Promise.all([
            db.notification.find({ user: req.user._id, ...IN_CENTER }).sort({ createdAt: -1 }).limit(100).lean(),
            db.notification.countDocuments({ user: req.user._id, readAt: null, ...IN_CENTER }),
        ]);
        res.json({ notifications: notices.map(view), unread });
    } catch (err) {
        logger.error(err, 'Failed to load the notifications');
        res.status(500).json({ message: 'The notifications could not be loaded.' });
    }
};

// for the count next to the bell: { unread }
export const unread = async (req, res) => {
    try {
        res.json({ unread: await db.notification.countDocuments({ user: req.user._id, readAt: null, ...IN_CENTER }) });
    } catch (err) {
        logger.error(err, 'Failed to count the notifications');
        res.status(500).json({ message: 'The notifications could not be counted.' });
    }
};

export const read = async (req, res) => {
    const notice = await db.notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id, readAt: null },
        { readAt: new Date() },
        { new: true }
    );
    res.json({ read: true, id: req.params.id, changed: Boolean(notice) });
};

export const readAll = async (req, res) => {
    const result = await db.notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
    res.json({ read: result.modifiedCount });
};

export const remove = async (req, res) => {
    await db.notification.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted.' });
};

// clears the list: every notification of the user
export const removeAll = async (req, res) => {
    const result = await db.notification.deleteMany({ user: req.user._id });
    res.json({ deleted: result.deletedCount });
};

// the groups of topics the user sees: the admin ones only for admins
const audienceOf = async (user) => {
    if (isGlobalAdmin(user)) return ['globalAdmin', 'everyone'];
    const admin = await db.club.exists({ admins: user._id });
    return ['player', 'everyone', ...(admin ? ['clubAdmin'] : [])];
};

const settingsOf = async (user) => {
    const { NOTIFICATION_GROUPS } = await import('../rules/notifications.js');
    const audience = await audienceOf(user);
    const groups = NOTIFICATION_GROUPS.filter(group => audience.includes(group.audience)).map(group => group.id);
    return {
        mailEnabled: isMailConfigured(),
        groups,
        topics: NOTIFICATION_TOPICS.filter(topic => groups.includes(topic.group)).map(topic => ({
            id: topic.id,
            group: topic.group,
            locked: Boolean(topic.locked),
            mailOnly: Boolean(topic.mailOnly),
            mails: topic.mails ?? ['off', 'instant', 'daily', 'weekly'],
            ...preferenceOf(user.notifications ?? {}, topic.id),
        })),
    };
};

/**
 * Which notifications the user gets and how: { mailEnabled, groups, topics:
 * [{ id, group, locked, mailOnly, mails, inApp, mail }] }.
 */
export const settings = async (req, res) => {
    res.json(await settingsOf(req.user));
};

/**
 * Saves the user's choices: { [topic]: { inApp, mail } }; what does not fit is left out.
 */
export const saveSettings = async (req, res) => {
    const user = await db.user.findById(req.user._id);
    user.notifications = { ...(user.notifications ?? {}), ...normalizePreferences(req.body) };
    user.markModified('notifications');
    await user.save();
    res.json(await settingsOf(user));
};

/**
 * What an unsubscribe link is for, before it is used: { type, topic } (no login needed).
 */
export const unsubscribeInfo = async (req, res) => {
    const target = readUnsubscribeToken(req.query.token);
    if (!target) return res.status(404).json({ message: 'This link is not valid.' });
    res.json({ type: target.type, topic: target.topic });
};

/**
 * Turns off the mails of an unsubscribe link (also one click from the mail program).
 */
export const unsubscribe = async (req, res) => {
    try {
        const done = await turnOff(req.query.token ?? req.body?.token);
        if (!done) return res.status(404).json({ message: 'This link is not valid.' });
        res.json(done);
    } catch (err) {
        logger.error(err, 'Failed to unsubscribe');
        res.status(500).json({ message: 'That did not work. Please try again.' });
    }
};
