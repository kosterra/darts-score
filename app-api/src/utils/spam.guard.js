import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import {
    RULES, CREATE_LIMITS, SIGNUP_LIMIT, IP_BLOCK_HOURS,
    hasLink, looksRandom, sentTooFast, createCounter,
} from './spam.rules.js';

// What was created recently, per account and address. Kept in memory: after
// a restart the counting simply starts again.
const counter = createCounter();
const LONGEST_WINDOW = Math.max(SIGNUP_LIMIT.windowMs, ...Object.values(CREATE_LIMITS).map(limit => limit.windowMs));
setInterval(() => counter.prune(LONGEST_WINDOW), 10 * 60 * 1000).unref();

// The same rule firing again for the same account or address within this
// time counts up the open alert
const REPEAT_WINDOW_MS = 60 * 60 * 1000;

// IPv4 addresses arrive as "::ffff:1.2.3.4" on a dual-stack server
export const clientIp = (req) => String(req.ip ?? req.socket?.remoteAddress ?? '').replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');

/**
 * Raises an alert for a rule, or counts up the open one it repeats.
 */
export const raiseAlert = async ({ rule, message, subject = {}, user = null, club = null, ip = '', action = 'none' }) => {
    const { severity } = RULES[rule];
    const who = user ? { user: user._id } : { ip };
    const existing = await db.alert.findOne({
        rule,
        status: 'open',
        ...who,
        lastSeenAt: { $gte: new Date(Date.now() - REPEAT_WINDOW_MS) },
    });
    if (existing) {
        existing.count += 1;
        existing.lastSeenAt = new Date();
        existing.message = message;
        if (action !== 'none') existing.action = action;
        await existing.save();
        return existing;
    }
    logger.info({ rule, user: user?.email, ip }, `Spam alert: ${message}`);
    return db.alert.create({
        rule,
        severity,
        message,
        subject,
        user: user?._id ?? null,
        userEmail: user?.email ?? '',
        club: club?._id ?? null,
        clubName: club?.name ?? '',
        ip,
        action,
    });
};

/**
 * Blocks an account: it cannot log in or use the API any more.
 * Global admins are never blocked, so nobody locks out the installation.
 */
export const blockUser = async (user, reason) => {
    if (user.role === ROLES.GLOBAL_ADMIN) return false;
    user.blockedAt = new Date();
    user.blockedReason = reason;
    // ends the sessions it has
    user.sessionVersion += 1;
    await user.save();
    logger.info(`Blocked user ${user.email}: ${reason}`);
    return true;
};

export const unblockUser = async (user) => {
    user.blockedAt = null;
    user.blockedReason = '';
    await user.save();
};

/**
 * Stops an address from registering, for some hours or (without hours) until unblocked.
 */
export const blockIp = async (ip, reason, { hours = null, blockedBy = 'rules' } = {}) => {
    if (!ip) return;
    const until = hours ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;
    await db.blockedIp.findOneAndUpdate({ ip }, { ip, reason, until, blockedBy }, { upsert: true });
    logger.info(`Blocked address ${ip} from registering: ${reason}`);
};

export const isIpBlocked = async (ip) => {
    const block = await db.blockedIp.findOne({ ip }).lean();
    // the database removes ended blocks only once a minute
    return Boolean(block && (!block.until || block.until > new Date()));
};

const nameAlerts = async ({ names, subject, user, club, ip }) => {
    const text = names.filter(Boolean).join(' ');
    if (hasLink(text)) {
        await raiseAlert({ rule: 'linkInName', message: `${subject.type} "${subject.name}" has a web address in its name`, subject, user, club, ip });
    } else if (names.some(looksRandom)) {
        await raiseAlert({ rule: 'randomName', message: `${subject.type} "${subject.name}" has a random-looking name`, subject, user, club, ip });
    }
};

/**
 * Checks a registration before the account is created. Resolves to
 * { status, message } when it is refused, otherwise to null.
 */
export const checkRegistration = async (req) => {
    const ip = clientIp(req);
    const { email = '', website, formTimeMs } = req.body;
    const subject = { type: 'Registration', name: email };

    if (await isIpBlocked(ip)) {
        return { status: 429, message: 'No new accounts can be registered from your network at the moment. Please try again later.' };
    }
    if (website) {
        await raiseAlert({ rule: 'honeypot', message: `Registration of ${email} filled in the hidden field`, subject, ip, action: 'ip-blocked' });
        await blockIp(ip, RULES.honeypot.title, { hours: IP_BLOCK_HOURS });
        return { status: 400, message: 'The registration failed. Please try again later.' };
    }
    if (sentTooFast(formTimeMs)) {
        await raiseAlert({ rule: 'fastForm', message: `Registration of ${email} was sent after ${Math.round(Number(formTimeMs))} ms`, subject, ip, action: 'rejected' });
        return { status: 400, message: 'That was very fast. Please check your entries and send the form again.' };
    }
    if (counter.count(`signup:${ip}`, SIGNUP_LIMIT.windowMs) >= SIGNUP_LIMIT.limit) {
        await raiseAlert({ rule: 'signupBurst', message: `Another registration (${email}) from ${ip} after ${SIGNUP_LIMIT.limit} in an hour`, subject, ip, action: 'ip-blocked' });
        await blockIp(ip, RULES.signupBurst.title, { hours: IP_BLOCK_HOURS });
        return { status: 429, message: 'No new accounts can be registered from your network at the moment. Please try again later.' };
    }
    return null;
};

/**
 * After a registration: counts it for its address and checks the names.
 */
export const noteRegistration = async (req, user) => {
    const ip = clientIp(req);
    counter.add(`signup:${ip}`, SIGNUP_LIMIT.windowMs);
    await nameAlerts({
        names: [user.firstname, user.lastname],
        subject: { type: 'Account', id: user._id, name: `${user.firstname} ${user.lastname}` },
        user,
        ip,
    });
};

/**
 * After something was created: counts it for the account, blocks an account
 * that creates more than a person can, and checks the name.
 * type is "club", "player", "game" or "training".
 */
export const noteCreated = async (req, type, { id = null, name = '', names = [name], club = req.club } = {}) => {
    const user = req.user;
    if (!user || user.role === ROLES.GLOBAL_ADMIN) return;
    const ip = clientIp(req);
    const subject = { type: type.charAt(0).toUpperCase() + type.slice(1), id, name };

    const { limit, windowMs, things, period } = CREATE_LIMITS[type];
    const count = counter.add(`${type}:${user._id}`, windowMs);
    if (count > limit) {
        const blocked = await blockUser(user, `${RULES.createBurst.title}: more than ${limit} ${things} ${period}`);
        await raiseAlert({
            rule: 'createBurst',
            message: `${user.email} created ${count} ${things} ${period}`,
            subject, user, club, ip,
            action: blocked ? 'user-blocked' : 'none',
        });
    }
    if (names.some(Boolean)) await nameAlerts({ names, subject, user, club, ip });
};

/**
 * Runs a check after the response, so a failing check never breaks the request.
 */
export const checkLater = (check) => {
    Promise.resolve().then(check).catch(err => logger.error(err, 'Spam check failed'));
};
