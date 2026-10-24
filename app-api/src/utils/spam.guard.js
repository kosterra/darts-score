import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import {
    RULES, CREATE_LIMITS, SIGNUP_LIMIT, IP_BLOCK_HOURS,
    QUICK_LIMIT, JOIN_LIMIT, DELETE_LIMIT, LOGIN_LIMIT, RESET_LIMIT,
    TAKEOVER_WINDOW_MS, CLUB_BADGE_BURST, FAIR_PLAY_IMPOSSIBLE,
    hasLink, looksRandom, sentTooFast, createCounter,
} from './spam.rules.js';
import { isImpossible } from './integrity.js';

// What was created recently, per account and address. Kept in memory: after
// a restart the counting simply starts again.
const counter = createCounter();
const LONGEST_WINDOW = Math.max(
    SIGNUP_LIMIT.windowMs, QUICK_LIMIT.windowMs, JOIN_LIMIT.windowMs, DELETE_LIMIT.windowMs, LOGIN_LIMIT.windowMs, RESET_LIMIT.windowMs,
    ...Object.values(CREATE_LIMITS).map(limit => limit.windowMs),
);
setInterval(() => counter.prune(LONGEST_WINDOW), 10 * 60 * 1000).unref();

// The same rule firing again for the same account or address within this
// time counts up the open alert
const REPEAT_WINDOW_MS = 60 * 60 * 1000;

// IPv4 addresses arrive as "::ffff:1.2.3.4" on a dual-stack server
export const clientIp = (req) => String(req.ip ?? req.socket?.remoteAddress ?? '').replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');

/**
 * Raises an alert for a rule, or counts up the open one it repeats: of the
 * same account, else of the same club (an alert about a club), else of the
 * same address.
 */
export const raiseAlert = async ({ rule, message, subject = {}, user = null, club = null, ip = '', action = 'none', repeatWindowMs = REPEAT_WINDOW_MS }) => {
    const { severity } = RULES[rule];
    const who = user ? { user: user._id } : club && !ip ? { club: club._id } : { ip };
    const existing = await db.alert.findOne({
        rule,
        status: 'open',
        ...who,
        lastSeenAt: { $gte: new Date(Date.now() - repeatWindowMs) },
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
 * After a quick game was started (no login): counts it for its address and
 * checks the names of its players.
 */
export const noteQuickGame = async (req, game) => {
    const ip = clientIp(req);
    const names = game.names ?? [];
    const subject = { type: 'Quick game', id: game._id, name: names.join(', ') };
    const count = counter.add(`quick:${ip}`, QUICK_LIMIT.windowMs);
    if (count > QUICK_LIMIT.limit) {
        await raiseAlert({ rule: 'quickBurst', message: `${count} quick games in an hour from ${ip}`, subject, ip });
    }
    for (const name of names) {
        await nameAlerts({ names: [name], subject: { ...subject, type: 'Quick game player', name }, ip });
    }
};

/**
 * After a request to join a club (or joining an open one): counts it for the
 * account and checks its message for web addresses.
 */
export const noteJoinRequest = async (req, club, message = '') => {
    const user = req.user;
    if (!user || user.role === ROLES.GLOBAL_ADMIN) return;
    const ip = clientIp(req);
    const subject = { type: 'Join request', id: club._id, name: club.name };
    const count = counter.add(`join:${user._id}`, JOIN_LIMIT.windowMs);
    if (count > JOIN_LIMIT.limit) {
        await raiseAlert({ rule: 'joinBurst', message: `${user.email} asked to join ${count} clubs in a day`, subject, user, club, ip });
    }
    if (hasLink(message)) {
        await raiseAlert({ rule: 'linkInText', message: `The request of ${user.email} to join "${club.name}" has a web address in its message`, subject, user, club, ip });
    }
};

/**
 * After a club's texts were changed: its description and the names of its formats.
 */
export const noteClubTexts = async (req, club, { description = '', formatNames = [] } = {}) => {
    const user = req.user;
    if (!user || user.role === ROLES.GLOBAL_ADMIN) return;
    const ip = clientIp(req);
    if (hasLink(description)) {
        await raiseAlert({ rule: 'linkInText', message: `The description of club "${club.name}" has a web address`, subject: { type: 'Club', id: club._id, name: club.name }, user, club, ip });
    }
    for (const name of formatNames) {
        await nameAlerts({ names: [name], subject: { type: 'Format', id: club._id, name }, user, club, ip });
    }
};

/**
 * When an admin removes another admin or deletes the club: an admin made one
 * only shortly before may be a taken-over account.
 * what: what they did, e.g. 'removed the admin x@y.ch'
 */
export const checkTakeover = async (req, club, what) => {
    const user = req.user;
    if (!user || user.role === ROLES.GLOBAL_ADMIN) return;
    const since = (club.adminSince ?? []).find(entry => String(entry.user) === String(user._id))?.at;
    if (!since || Date.now() - new Date(since).getTime() > TAKEOVER_WINDOW_MS) return;
    const hours = Math.max(1, Math.round((Date.now() - new Date(since).getTime()) / (60 * 60 * 1000)));
    await raiseAlert({
        rule: 'adminTakeover',
        message: `${user.email}, an admin of "${club.name}" for ${hours} h, ${what}`,
        subject: { type: 'Club', id: club._id, name: club.name },
        user, club, ip: clientIp(req),
    });
};

/**
 * After a game, training or player was deleted: counts it for the account.
 */
export const noteDeleted = async (req, type) => {
    const user = req.user;
    if (!user || user.role === ROLES.GLOBAL_ADMIN) return;
    const count = counter.add(`delete:${user._id}`, DELETE_LIMIT.windowMs);
    if (count > DELETE_LIMIT.limit) {
        await raiseAlert({
            rule: 'deleteBurst',
            message: `${user.email} deleted ${count} games, trainings or players in ${DELETE_LIMIT.windowMs / 60000} minutes (the last a ${type})`,
            subject: { type: type.charAt(0).toUpperCase() + type.slice(1) },
            user, club: req.club ?? null, ip: clientIp(req),
        });
    }
};

// counts an attempt for the account and the address; alerts the first over the limit
const burst = async ({ prefix, limit: { limit, windowMs }, req, email, user, rule, what }) => {
    const ip = clientIp(req);
    const byAccount = email ? counter.add(`${prefix}:${String(email).toLowerCase()}`, windowMs) : 0;
    const byAddress = counter.add(`${prefix}ip:${ip}`, windowMs);
    if (byAccount <= limit && byAddress <= limit) return;
    const message = byAccount > limit
        ? `${byAccount} ${what} for ${email} in ${windowMs / 60000} minutes`
        : `${byAddress} ${what} from ${ip} in ${windowMs / 60000} minutes`;
    await raiseAlert({ rule, message, subject: { type: 'Account', name: email ?? '' }, user: byAccount > limit ? user : null, ip });
};

/**
 * After a failed login: counts it for the account (also an unknown email) and the address.
 */
export const noteLoginFailure = (req, email, user = null) =>
    burst({ prefix: 'login', limit: LOGIN_LIMIT, req, email, user, rule: 'loginBurst', what: 'failed logins' });

/**
 * After a password reset was asked for: counts it for the account and the address.
 */
export const noteResetRequest = (req, email, user = null) =>
    burst({ prefix: 'reset', limit: RESET_LIMIT, req, email, user, rule: 'resetBurst', what: 'password resets' });

/**
 * After a club's badges were worked out: a young club earning many of them
 * within a day.
 */
export const noteClubBadges = async (club, fresh) => {
    if (!fresh.length || !club.createdAt) return;
    if (Date.now() - new Date(club.createdAt).getTime() > CLUB_BADGE_BURST.youngDays * 24 * 60 * 60 * 1000) return;
    const from = Date.now() - CLUB_BADGE_BURST.windowMs;
    const recent = (club.badges ?? []).filter(entry => entry.earnedAt && new Date(entry.earnedAt).getTime() >= from);
    if (recent.length < CLUB_BADGE_BURST.badges) return;
    await raiseAlert({
        rule: 'clubBadgeBurst',
        message: `Club "${club.name}" earned ${recent.length} club badges within a day`,
        subject: { type: 'Club', id: club._id, name: club.name },
        club,
        repeatWindowMs: CLUB_BADGE_BURST.windowMs,
    });
};

/**
 * After a game was finished or a training saved: an impossible one is noted
 * for its club, and enough of them within 30 days raise an alert.
 * type: as on the fair play page (x01, rules, rulesTraining, …).
 */
export const noteFairPlay = async (clubId, type, doc) => {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
    if (!clubId || !plain || !isImpossible(type, plain)) return;
    await db.fairPlayHit.updateOne(
        { sourceId: String(plain._id) },
        { $setOnInsert: { club: clubId, sourceType: type, sourceId: String(plain._id), at: new Date() } },
        { upsert: true },
    );
    const count = await db.fairPlayHit.countDocuments({ club: clubId, at: { $gte: new Date(Date.now() - FAIR_PLAY_IMPOSSIBLE.windowMs) } });
    if (count < FAIR_PLAY_IMPOSSIBLE.count) return;
    const club = await db.club.findById(clubId, 'name');
    if (!club) return;
    await raiseAlert({
        rule: 'fairPlayImpossible',
        message: `Club "${club.name}" has ${count} impossible games or trainings within 30 days`,
        subject: { type: 'Club', id: club._id, name: club.name },
        club,
        repeatWindowMs: FAIR_PLAY_IMPOSSIBLE.windowMs,
    });
};

/**
 * Runs a check after the response, so a failing check never breaks the request.
 */
export const checkLater = (check) => {
    Promise.resolve().then(check).catch(err => logger.error(err, 'Spam check failed'));
};
