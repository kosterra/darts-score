import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

/**
 * How many quick games were finished (and how many of them in darts
 * evenings) and how many darts evenings played (counted when they end, with
 * at least one game finished),
 * since counting began: the games and evenings themselves are deleted after
 * a month, so these counts are kept on their own (a setting). The first
 * time they are asked for, they start from what is still kept, and say
 * since when they count.
 */

const KEY = 'quickTally';

// the counts as kept, made from what is still there the first time: { quickGames, evenings, since }
export const quickTally = async () => {
    const kept = await db.setting.findOne({ key: KEY }).lean();
    if (kept) return kept.value;
    const [quickGames, eveningGames, evenings, oldest] = await Promise.all([
        db.quickGame.countDocuments({ hasWinner: true }),
        db.quickGame.countDocuments({ hasWinner: true, evening: { $ne: null } }),
        db.quickGame.distinct('evening', { hasWinner: true, evening: { $ne: null } }).then(ids => ids.length),
        db.quickGame.findOne({}, 'createdAt').sort({ createdAt: 1 }).lean(),
    ]);
    const value = { quickGames, eveningGames, evenings, since: oldest?.createdAt ?? new Date() };
    // what is counted here does not count again
    await db.quickGame.updateMany({ hasWinner: true }, { $set: { counted: true } });
    const played = await db.quickGame.distinct('evening', { hasWinner: true, evening: { $ne: null } });
    await db.quickEvening.updateMany({ _id: { $in: played } }, { $set: { counted: true } });
    // another request may have started them at the same time: the first one wins
    await db.setting.updateOne({ key: KEY }, { $setOnInsert: { value } }, { upsert: true });
    return (await db.setting.findOne({ key: KEY }).lean()).value;
};

/**
 * A quick game was saved: counted once when it is finished (an undo and a
 * second finish do not count again).
 */
export const countQuickGame = async (game) => {
    if (!game.hasWinner || game.counted) return;
    try {
        await quickTally();
        // only the first request marks it: two saves at once count it once
        const marked = await db.quickGame.updateOne({ _id: game._id, counted: { $ne: true } }, { $set: { counted: true } });
        if (!marked.modifiedCount) return;
        game.counted = true;
        await db.setting.updateOne({ key: KEY }, { $inc: { 'value.quickGames': 1, ...(game.evening && { 'value.eveningGames': 1 }) } });
    } catch (err) {
        logger.error(err, 'Failed to count a finished quick game');
    }
};

/**
 * A darts evening ended: counted once as played, when a game of it was
 * finished.
 */
export const countEvening = async (evening) => {
    try {
        if (evening.counted) return;
        if (!(await db.quickGame.countDocuments({ evening: evening._id, hasWinner: true }))) return;
        await quickTally();
        const marked = await db.quickEvening.updateOne({ _id: evening._id, counted: { $ne: true } }, { $set: { counted: true } });
        if (!marked.modifiedCount) return;
        evening.counted = true;
        await db.setting.updateOne({ key: KEY }, { $inc: { 'value.evenings': 1 } });
    } catch (err) {
        logger.error(err, 'Failed to count a darts evening');
    }
};
