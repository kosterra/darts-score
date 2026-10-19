import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

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
            db.notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean(),
            db.notification.countDocuments({ user: req.user._id, readAt: null }),
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
        res.json({ unread: await db.notification.countDocuments({ user: req.user._id, readAt: null }) });
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
