import { createHmac, timingSafeEqual } from 'node:crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { preferenceOf, topicOfKind } from '../rules/notifications.js';
import { getSessionSecret } from './auth.utils.js';
import { getAppUrl, isMailConfigured } from './mail.utils.js';
import { sendTemplateMail } from './mail.service.js';
import { layoutOf } from './mail.languages.js';
import { translate } from './translate.js';

/**
 * Delivers the notifications of the app as each user wants them (see
 * rules/notifications.js): in the notification center, by mail at once, or
 * with the mail of the day or the week. Players without a login get theirs
 * at the address their club keeps for them (see playerContact).
 */

// ---------------------------------------------------------------------------
// Unsubscribe links: signed, so they work without logging in
// ---------------------------------------------------------------------------

const sign = (payload) => createHmac('sha256', `unsubscribe:${getSessionSecret()}`).update(payload).digest('base64url');

/**
 * A token that turns off one topic by mail ('all': every mail that can be
 * turned off) for an account ('user') or a player without a login ('contact').
 */
export const unsubscribeToken = (type, id, topic = 'all') => {
    const payload = Buffer.from(JSON.stringify([type === 'contact' ? 'c' : 'u', String(id), topic])).toString('base64url');
    return `${payload}.${sign(payload)}`;
};

// → { type, id, topic } or null when the token is not one of ours
export const readUnsubscribeToken = (token) => {
    const [payload, signature] = String(token ?? '').split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
        const [type, id, topic] = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!db.mongoose.isValidObjectId(id) || typeof topic !== 'string') return null;
        return { type: type === 'c' ? 'contact' : 'user', id, topic };
    } catch {
        return null;
    }
};

const unsubscribeUrl = (token) => `${getAppUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
// one-click unsubscribing from the mail program (RFC 8058)
const unsubscribeHeaders = (token) => ({
    'List-Unsubscribe': `<${getAppUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});
const manageUrl = () => `${getAppUrl()}/profile#notifications`;

// ---------------------------------------------------------------------------
// Words of the mails
// ---------------------------------------------------------------------------

const LOCALES = { en: 'en-GB', de: 'de-CH', fr: 'fr-CH', it: 'it-CH', es: 'es-ES' };
export const languageOf = (user) => (user?.language && LOCALES[user.language] ? user.language : 'en');
export const dateTimeIn = (language, date = new Date()) => new Intl.DateTimeFormat(LOCALES[language] ?? 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
const linkOf = (path) => `${getAppUrl()}${path ?? '/notifications'}`;
// a notice as a line of a list in the mail
const lineOf = (notice, language) => `• ${translate(language, notice.title)}`;

// ---------------------------------------------------------------------------
// Delivering
// ---------------------------------------------------------------------------

const USER_FIELDS = 'email firstname language notifications role blockedAt';

/**
 * Sends one notification by mail at once.
 */
const mailNow = async (user, notice, topicId) => {
    const language = languageOf(user);
    const token = unsubscribeToken('user', user._id, topicId ?? 'all');
    return sendTemplateMail('notification', user.email, {
        firstname: user.firstname,
        title: translate(language, notice.title),
        details: translate(language, notice.body ?? ''),
        link: linkOf(notice.link),
        manageUrl: manageUrl(),
    }, language, { headers: unsubscribeHeaders(token) });
};

/**
 * Delivers notifications to accounts, as each one wants them.
 * notices: [{ user, kind, title, body, link, club, by, byName }].
 * Resolves to the notifications stored.
 */
export const deliver = async (notices) => {
    const list = (notices ?? []).filter(notice => notice?.user);
    if (!list.length) return [];
    const ids = [...new Set(list.map(notice => String(notice.user)))];
    const users = new Map((await db.user.find({ _id: { $in: ids } }, USER_FIELDS).lean()).map(user => [String(user._id), user]));
    const stored = [];
    for (const notice of list) {
        const user = users.get(String(notice.user));
        if (!user) continue;
        const topic = topicOfKind(notice.kind);
        const preference = topic ? preferenceOf(user.notifications, topic.id) : { inApp: true, mail: 'off' };
        if (!preference.inApp && preference.mail === 'off') continue;
        // a blocked account gets no mails, except the one that tells it so
        const mail = user.blockedAt && notice.kind !== 'accountBlocked' ? 'off' : preference.mail;
        const doc = await db.notification.create({ ...notice, inApp: preference.inApp, mail });
        stored.push(doc);
        // the security mails have templates of their own (see notifySecurity)
        if (mail === 'instant' && isMailConfigured() && topic?.id !== 'security') {
            try {
                await mailNow(user, notice, topic?.id);
                doc.mailedAt = new Date();
                await doc.save();
            } catch (err) {
                logger.error(err, `Failed to mail the notification ${notice.kind} to ${user.email}`);
            }
        }
    }
    return stored;
};

// never let a notification get in the way of what caused it
export const deliverQuietly = (notices) => deliver(notices).catch(err => {
    logger.error(err, 'Failed to deliver notifications');
    return [];
});

/**
 * A mail about the security of an account: always sent (when mail is set
 * up), in its own template, with a notification in the center.
 * kind: 'passwordChanged' | 'emailChanged' | 'accountBlocked'; to: another
 * address than the account's (the old one, for a changed address).
 */
export const notifySecurity = async (user, kind, { title, body, vars = {}, to = null, link = '/profile', template = kind } = {}) => {
    try {
        await deliver([{ user: user._id, kind, title, body, link }]);
        const language = languageOf(user);
        await sendTemplateMail(template, to ?? user.email, {
            firstname: user.firstname,
            date: dateTimeIn(language),
            link: kind === 'passwordChanged' ? `${getAppUrl()}/forgot-password` : `${getAppUrl()}/login`,
            // the general one says what happened in its own words
            ...(template === 'securityNotice' && { title: translate(language, title), details: translate(language, body) }),
            ...vars,
        }, language);
    } catch (err) {
        logger.error(err, `Failed to send the ${kind} mail`);
    }
};

/**
 * Notifications for players without a login, at the address their club
 * keeps for them, for the topics their admins chose: noted for the mail of
 * the day. notices: [{ player, kind, title, body, club }].
 */
export const deliverToContacts = async (notices) => {
    const list = (notices ?? []).filter(notice => notice?.player);
    if (!list.length) return;
    const contacts = new Map((await db.playerContact.find({ player: { $in: list.map(notice => notice.player) }, unsubscribedAt: null }).lean())
        .map(contact => [String(contact.player), contact]));
    const docs = list.flatMap(notice => {
        const contact = contacts.get(String(notice.player));
        const topic = topicOfKind(notice.kind);
        if (!contact || !topic || !contact.topics.includes(topic.id)) return [];
        return [{ ...notice, user: null, inApp: false, mail: 'daily' }];
    });
    if (docs.length) await db.notification.insertMany(docs);
};

// ---------------------------------------------------------------------------
// The mails of the day and the week
// ---------------------------------------------------------------------------

// they go out from this hour on (the server's time)
export const DIGEST_HOUR = 7;

const startOfDay = (now) => new Date(now.getFullYear(), now.getMonth(), now.getDate());
// the Monday of the week
const startOfWeek = (now) => {
    const day = startOfDay(now);
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return day;
};

/**
 * Whether the mail of a period is due: from DIGEST_HOUR on, once a day, or
 * once a week from Monday.
 */
export const digestDue = (period, lastSent, now = new Date()) => {
    if (now.getHours() < DIGEST_HOUR) return false;
    const from = period === 'weekly' ? startOfWeek(now) : startOfDay(now);
    return !lastSent || new Date(lastSent) < from;
};

const digestOfUser = async (user, period, notices) => {
    const language = languageOf(user);
    const layout = layoutOf(language);
    const token = unsubscribeToken('user', user._id, 'all');
    await sendTemplateMail('digest', user.email, {
        firstname: user.firstname,
        period: layout.period[period],
        list: notices.map(notice => lineOf(notice, language)).join('\n'),
        link: `${getAppUrl()}/notifications`,
        manageUrl: manageUrl(),
    }, language, { headers: unsubscribeHeaders(token) });
};

/**
 * Sends the mails of the day and the week that are due: per account the
 * notifications not mailed yet, and per player without a login theirs.
 */
export const sendDigests = async (now = new Date()) => {
    if (!isMailConfigured()) return 0;
    let sent = 0;
    for (const period of ['daily', 'weekly']) {
        const userIds = await db.notification.distinct('user', { mail: period, mailedAt: null, user: { $ne: null } });
        for (const userId of userIds) {
            const user = await db.user.findById(userId, `${USER_FIELDS} digestSentAt`);
            if (!user || user.blockedAt || !digestDue(period, user.digestSentAt?.[period], now)) continue;
            const notices = await db.notification.find({ user: userId, mail: period, mailedAt: null }).sort({ createdAt: 1 }).limit(50).lean();
            if (!notices.length) continue;
            try {
                await digestOfUser(user, period, notices);
                await db.notification.updateMany({ _id: { $in: notices.map(notice => notice._id) } }, { mailedAt: now });
                await db.user.updateOne({ _id: user._id }, { $set: { [`digestSentAt.${period}`]: now } });
                sent += 1;
            } catch (err) {
                logger.error(err, `Failed to send the ${period} mail to ${user.email}`);
            }
        }
    }
    sent += await sendContactDigests(now);
    return sent;
};

/**
 * A mail to a player without a login: what happened (the badges, the level,
 * the records) or their week, with the link to a login of their own.
 */
export const mailContact = async (contact, { title, details }) => {
    const player = await db.player.findById(contact.player, 'nickname firstname clubs user').lean();
    if (!player || player.user) return false;
    const club = await db.club.findById(player.clubs?.[0], 'name').lean();
    const { claimLink } = await import('./player.claims.js');
    const language = contact.language ?? 'en';
    const token = unsubscribeToken('contact', contact._id, 'all');
    return sendTemplateMail('contactNews', contact.email, {
        firstname: player.firstname,
        nickname: player.nickname,
        club: club?.name ?? '',
        title: translate(language, title),
        details,
        link: await claimLink(player, club?._id ?? player.clubs?.[0], null),
        unsubscribeUrl: unsubscribeUrl(token),
    }, language, { headers: unsubscribeHeaders(token) });
};

const sendContactDigests = async (now) => {
    let sent = 0;
    const playerIds = await db.notification.distinct('player', { mail: 'daily', mailedAt: null, player: { $ne: null } });
    for (const playerId of playerIds) {
        const contact = await db.playerContact.findOne({ player: playerId, unsubscribedAt: null });
        const notices = await db.notification.find({ player: playerId, mail: 'daily', mailedAt: null }).sort({ createdAt: 1 }).limit(50).lean();
        const done = () => db.notification.updateMany({ _id: { $in: notices.map(notice => notice._id) } }, { mailedAt: now });
        if (!contact) {
            await done();
            continue;
        }
        if (!digestDue('daily', contact.digestSentAt?.daily, now)) continue;
        try {
            const language = contact.language ?? 'en';
            await mailContact(contact, {
                title: 'Your news from the oche',
                details: notices.map(notice => lineOf(notice, language)).join('\n'),
            });
            await done();
            await db.playerContact.updateOne({ _id: contact._id }, { $set: { 'digestSentAt.daily': now } });
            sent += 1;
        } catch (err) {
            logger.error(err, `Failed to send the news of player ${playerId}`);
        }
    }
    return sent;
};

// ---------------------------------------------------------------------------
// Unsubscribing
// ---------------------------------------------------------------------------

/**
 * Turns off what a token is for. Resolves to { type, topic } or null.
 */
export const unsubscribe = async (token) => {
    const target = readUnsubscribeToken(token);
    if (!target) return null;
    if (target.type === 'contact') {
        const contact = await db.playerContact.findById(target.id);
        if (!contact) return null;
        contact.unsubscribedAt = contact.unsubscribedAt ?? new Date();
        await contact.save();
        return { type: 'contact', topic: 'all' };
    }
    const user = await db.user.findById(target.id);
    if (!user) return null;
    const { NOTIFICATION_TOPICS, topicById } = await import('../rules/notifications.js');
    const preferences = { ...(user.notifications ?? {}) };
    const topics = target.topic === 'all' ? NOTIFICATION_TOPICS.filter(topic => !topic.locked) : [topicById(target.topic)].filter(Boolean);
    for (const topic of topics) preferences[topic.id] = { ...(preferences[topic.id] ?? {}), mail: 'off' };
    user.notifications = preferences;
    user.markModified('notifications');
    await user.save();
    return { type: 'user', topic: target.topic };
};
