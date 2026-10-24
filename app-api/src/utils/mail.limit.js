import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { dayKey } from './sessions.js';

/**
 * The daily limit of the mail server (e.g. 300 mails a day with many
 * providers): every mail sent is counted per day. Close to the limit the
 * global admins hear it while a mail still goes out; once it is reached they
 * hear it in the app, and the mails of the rest of the day are held back (the
 * mail server would refuse them, and some providers block an account that
 * keeps trying). A mail server that refuses mails for a limit of its own
 * counts as reached too. The global admins set the limit under System
 * settings → Mail server.
 */

const KEY = 'mailLimit';
// close to the limit from this share on
export const NEAR_SHARE = 0.8;
export const LIMIT_RANGE = { min: 1, max: 1000000 };

// a mail not sent because the limit of the day is reached
export class MailLimitError extends Error {
    constructor() {
        super('The daily mail limit is reached; the mail is held back until tomorrow.');
        this.code = 'ELIMIT';
    }
}

let cached = { at: 0, value: null };

// the limit per day, or null without one
export const getMailLimit = async () => {
    if (Date.now() - cached.at < 30 * 1000) return cached.value;
    const value = (await db.setting.findOne({ key: KEY }).lean())?.value?.perDay ?? null;
    cached = { at: Date.now(), value };
    return value;
};

export const saveMailLimit = async (perDay) => {
    const value = perDay ? Math.min(LIMIT_RANGE.max, Math.max(LIMIT_RANGE.min, Math.round(perDay))) : null;
    await db.setting.updateOne({ key: KEY }, { $set: { value: { perDay: value } } }, { upsert: true });
    cached = { at: Date.now(), value };
    // today goes by the new limit
    await db.usageDay.updateOne({ day: dayKey() }, { $set: { mailLimit: value } });
    return value;
};

const startOfDay = (at) => new Date(at.getFullYear(), at.getMonth(), at.getDate());
const today = (now) => db.usageDay.findOne({ day: dayKey(now) }, 'mails mailsHeldBack mailLimit mailLimitReachedAt').lean();

// tells the global admins, in the app and (as they chose) by mail
const tell = async (kind, title, body) => {
    const { deliverQuietly } = await import('./notify.js');
    const admins = await db.user.find({ role: ROLES.GLOBAL_ADMIN, blockedAt: null }, '_id').lean();
    await deliverQuietly(admins.map(admin => ({ user: admin._id, kind, title, body, link: '/system-settings#mail-server' })));
};

/**
 * Before a mail goes out: throws a MailLimitError (and counts it as held
 * back) when the limit of the day is reached.
 */
export const checkMailLimit = async (now = new Date()) => {
    const day = await today(now);
    if (!day?.mailLimitReachedAt) return;
    await db.usageDay.updateOne({ day: dayKey(now) }, { $inc: { mailsHeldBack: 1 } });
    throw new MailLimitError();
};

// notes that the limit of the day is reached, once; true the first time
const markReached = async (now, limit) => {
    const { modifiedCount, upsertedCount } = await db.usageDay.updateOne(
        { day: dayKey(now), mailLimitReachedAt: null },
        { $set: { mailLimitReachedAt: now, ...(limit ? { mailLimit: limit } : {}) }, $setOnInsert: { at: startOfDay(now) } },
        { upsert: true },
    ).catch(err => (err?.code === 11000 ? { modifiedCount: 0 } : Promise.reject(err)));
    return Boolean(modifiedCount || upsertedCount);
};

/**
 * After a mail went out: counts it; close to the limit, and at it, the
 * global admins hear it once a day.
 */
export const countMail = async (now = new Date()) => {
    const limit = await getMailLimit();
    const day = await db.usageDay.findOneAndUpdate(
        { day: dayKey(now) },
        { $inc: { mails: 1 }, $set: { mailLimit: limit }, $setOnInsert: { at: startOfDay(now) } },
        { upsert: true, new: true, projection: 'mails mailLimitNearAt' },
    ).lean();
    if (!limit) return;
    if (day.mails >= limit) {
        if (await markReached(now, limit)) {
            logger.warn(`The daily mail limit of ${limit} is reached`);
            await tell('mailLimitReached', `Mail limit reached: ${limit} mails today`, 'Further mails are held back until tomorrow. Raise the limit under System settings → Mail server if your mail server allows more.');
        }
    } else if (day.mails >= Math.ceil(limit * NEAR_SHARE) && !day.mailLimitNearAt) {
        const { modifiedCount } = await db.usageDay.updateOne({ day: dayKey(now), mailLimitNearAt: null }, { $set: { mailLimitNearAt: now } });
        if (modifiedCount) await tell('mailLimitNear', `Mail limit almost reached: ${day.mails} of ${limit} mails today`, 'Once it is reached, further mails are held back until tomorrow.');
    }
};

// whether a mail server refused a mail for a limit of its own (a quota, too many mails)
export const isLimitRefusal = (err) => [421, 450, 451, 452, 454, 550, 554].includes(err?.responseCode)
    && /limit|quota|too many|exceeded|rate/i.test(`${err?.response ?? ''} ${err?.message ?? ''}`);

/**
 * A mail the mail server refused for its own limit: the limit of the day
 * counts as reached, so the rest of the day's mails wait.
 */
export const noteLimitRefusal = async (err, now = new Date()) => {
    if (!isLimitRefusal(err)) return false;
    if (await markReached(now, await getMailLimit())) {
        logger.warn(`The mail server refused a mail for its daily limit: ${err.response ?? err.message}`);
        await tell('mailLimitReached', 'The mail server refused mails: its daily limit is reached', 'Further mails are held back until tomorrow. Check the limit of your mail provider and set it under System settings → Mail server.');
    }
    return true;
};

/**
 * The mails of the last days, newest first, for the global admins:
 * [{ day, mails, heldBack, limit, reached }], with the limit set now.
 */
export const mailDays = async (count = 7, now = new Date()) => {
    const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1));
    const days = await db.usageDay.find({ at: { $gte: since } }, 'day at mails mailsHeldBack mailLimit mailLimitReachedAt').sort({ at: -1 }).lean();
    const byDay = new Map(days.map(entry => [entry.day, entry]));
    const list = Array.from({ length: count }, (_, back) => {
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
        const entry = byDay.get(dayKey(at));
        return { day: at, mails: entry?.mails ?? 0, heldBack: entry?.mailsHeldBack ?? 0, limit: entry?.mailLimit ?? null, reached: Boolean(entry?.mailLimitReachedAt) };
    });
    return { limit: await getMailLimit(), days: list };
};
