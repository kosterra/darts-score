import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { isGlobalAdmin } from '../middleware/auth.middleware.js';
import { HISTORY_WEEKS, goalError, goalsOverview, normalizeGoals, pastWeeks } from '../utils/practice.goals.js';

/**
 * The weekly practice goals of the logged-in user (see utils/practice.goals.js):
 * their own, in all their clubs; nobody else sees them.
 */

/**
 * The goals with how far each is this week, the week, the weeks in a row
 * with all goals reached and the recent weeks. Global admins play in no
 * club: they have none.
 */
export const findMine = async (req, res) => {
    try {
        if (isGlobalAdmin(req.user)) return res.json({ goals: [], week: null, streak: 0, recent: [], maxGoals: 0 });
        res.json(await goalsOverview(req.user));
    } catch (err) {
        logger.error(err, 'Failed to load the practice goals');
        res.status(500).json({ message: 'The goals could not be loaded.' });
    }
};

/**
 * The whole list of goals, as the user set it (up to three). A goal sent
 * back with its id and the same settings stays the same goal (reached this
 * week stays reached); a new or changed one starts over. Answers as findMine.
 */
export const save = async (req, res) => {
    if (isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Goals are for players: a global admin plays in no club.' });
    const problem = req.body.goals.map(goalError).find(Boolean);
    if (problem) return res.status(422).json({ errors: [problem] });
    try {
        const user = await db.user.findById(req.user._id, 'practiceGoals');
        user.practiceGoals = normalizeGoals(req.body.goals, user.practiceGoals ?? []);
        await user.save();
        res.json(await goalsOverview(user));
    } catch (err) {
        logger.error(err, 'Failed to save the practice goals');
        res.status(500).json({ message: 'The goals could not be saved.' });
    }
};

// the past weeks, newest first (?weeks=12)
export const history = async (req, res) => {
    try {
        const weeks = Math.min(HISTORY_WEEKS, Number(req.query.weeks ?? 12));
        res.json({ weeks: await pastWeeks(req.user._id, weeks) });
    } catch (err) {
        logger.error(err, 'Failed to load the past weeks of the practice goals');
        res.status(500).json({ message: 'The past weeks could not be loaded.' });
    }
};
