import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { endSessionsOf, loggedIn } from '../utils/sessions.js';
import { weeklyUsage } from '../utils/usage.stats.js';

/**
 * For the global admins: who is logged in now (and ending a session), and
 * the use of the app per week.
 */

// the totals and every logged-in account with its sessions; the admin's own marked
export const sessions = async (req, res) => res.json(await loggedIn(req.sessionId));

// ends one session: the device has to log in again
export const endOne = async (req, res) => {
    const session = await db.session.findById(req.params.id, 'user sid').lean();
    if (!session) return res.status(404).json({ message: 'This session has already ended.' });
    if (session.sid === req.sessionId) return res.status(409).json({ message: 'This is your own session. Log out instead.' });
    await db.session.deleteOne({ _id: session._id });
    logger.info(`Session of user ${session.user} ended by ${req.user.email}`);
    res.json(await loggedIn(req.sessionId));
};

// ends every session of an account (never the admin's own)
export const endAllOf = async (req, res) => {
    if (String(req.params.id) === String(req.user._id)) return res.status(409).json({ message: 'These are your own sessions. Log out instead.' });
    const { deletedCount } = await endSessionsOf(req.params.id);
    logger.info(`${deletedCount} sessions of user ${req.params.id} ended by ${req.user.email}`);
    res.json(await loggedIn(req.sessionId));
};

// the last weeks (?weeks=12), the current one first
export const usage = async (req, res) => res.json(await weeklyUsage(Number(req.query.weeks) || 12));
