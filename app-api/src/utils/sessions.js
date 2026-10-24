import { randomBytes } from 'node:crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

/**
 * The logins that are running, kept on the server: the session cookie carries
 * the sid of one. Global admins see who is logged in and can end a session;
 * a session ends with a logout, a new password, or when its time is up. Every
 * use of the app also counts towards the usage statistics of the day.
 */

const MINUTE = 60 * 1000;
// a session is "active now" when it was used within this time
export const ACTIVE_MINUTES = 5;
// how often the last use of a session is written down
const TOUCH_MS = MINUTE;

export const newSid = () => randomBytes(18).toString('base64url');

// the day in the time zone of the server: "2026-10-24"
export const dayKey = (at = new Date()) => {
    const date = new Date(at);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const startOfDay = (at) => {
    const date = new Date(at);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * The browser and system of a user agent, in a few words: "Firefox · Android".
 */
export const deviceOf = (userAgent = '') => {
    const agent = String(userAgent);
    const browser = /Edg\//.test(agent) ? 'Edge'
        : /OPR\/|Opera/.test(agent) ? 'Opera'
        : /SamsungBrowser/.test(agent) ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(agent) ? 'Firefox'
        : /Chrome\/|CriOS/.test(agent) ? 'Chrome'
        : /Safari\//.test(agent) ? 'Safari'
        : '';
    const system = /iPhone/.test(agent) ? 'iPhone'
        : /iPad/.test(agent) ? 'iPad'
        : /Android/.test(agent) ? 'Android'
        : /Windows/.test(agent) ? 'Windows'
        : /Mac OS X|Macintosh/.test(agent) ? 'macOS'
        : /CrOS/.test(agent) ? 'ChromeOS'
        : /Linux/.test(agent) ? 'Linux'
        : '';
    return [browser, system].filter(Boolean).join(' · ');
};

// the accounts that used the app today, noted once a day each (kept in memory, per day)
let noted = { day: '', users: new Set() };
const noteActive = async (userId, now) => {
    const day = dayKey(now);
    if (noted.day !== day) noted = { day, users: new Set() };
    const id = String(userId);
    if (noted.users.has(id)) return;
    noted.users.add(id);
    await db.usageDay.updateOne({ day }, { $addToSet: { users: userId }, $setOnInsert: { at: startOfDay(now) } }, { upsert: true });
};

/**
 * Notes a session that starts or goes on: the sid of the cookie, or a new one
 * for a new login (counted as a login of the day). Resolves to the sid.
 */
export const recordSession = async (req, user, expiresAt, { sid = null, login = false } = {}) => {
    const now = new Date();
    const id = sid ?? newSid();
    await db.session.updateOne(
        { sid: id },
        {
            $set: { user: user._id, v: user.sessionVersion ?? 0, expiresAt: new Date(expiresAt), lastSeenAt: now, device: deviceOf(req.get?.('user-agent')) },
        },
        { upsert: true },
    );
    if (login) {
        await db.usageDay.updateOne({ day: dayKey(now) }, { $inc: { logins: 1 }, $setOnInsert: { at: startOfDay(now) } }, { upsert: true });
    }
    await noteActive(user._id, now).catch(err => logger.warn(`Could not note the use of the app: ${err.message}`));
    return id;
};

/**
 * The session of a cookie, or null when it was ended (logged out elsewhere,
 * ended by a global admin). Notes that it was used, now and then.
 */
export const findSession = async (sid, user) => {
    const session = await db.session.findOne({ sid, user: user._id }).lean();
    if (!session) return null;
    const now = new Date();
    if (now - new Date(session.lastSeenAt) > TOUCH_MS) {
        db.session.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } }).catch(() => {});
    }
    noteActive(user._id, now).catch(err => logger.warn(`Could not note the use of the app: ${err.message}`));
    return session;
};

export const endSession = (sid) => db.session.deleteOne({ sid });
export const endSessionsOf = (userId) => db.session.deleteMany({ user: userId });

/**
 * Who is logged in now, for the global admins: the totals and every account
 * with its sessions, the most recently used first. Sessions an account can no
 * longer use (a new password, blocked, deleted) are cleared on the way.
 * currentSid: the session of the admin asking, marked as theirs.
 */
export const loggedIn = async (currentSid = null, now = new Date()) => {
    const sessions = await db.session.find({ expiresAt: { $gt: now } }).sort({ lastSeenAt: -1 }).lean();
    const users = await db.user.find({ _id: { $in: [...new Set(sessions.map(session => String(session.user)))] } }, 'firstname lastname email role sessionVersion blockedAt lastLoginAt').lean();
    const byId = new Map(users.map(user => [String(user._id), user]));
    const stale = sessions.filter(session => {
        const user = byId.get(String(session.user));
        return !user || user.blockedAt || (user.sessionVersion ?? 0) !== session.v;
    });
    if (stale.length) await db.session.deleteMany({ _id: { $in: stale.map(session => session._id) } });
    const live = sessions.filter(session => !stale.includes(session));

    const accounts = new Map();
    for (const session of live) {
        const key = String(session.user);
        if (!accounts.has(key)) {
            const user = byId.get(key);
            accounts.set(key, { id: key, firstname: user.firstname, lastname: user.lastname, email: user.email, role: user.role, sessions: [] });
        }
        accounts.get(key).sessions.push({
            id: String(session._id), device: session.device, startedAt: session.createdAt, lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt,
            current: session.sid === currentSid,
        });
    }
    const activeSince = new Date(now - ACTIVE_MINUTES * MINUTE);
    const today = await db.usageDay.findOne({ day: dayKey(now) }, 'users').lean();
    const list = [...accounts.values()].map(account => ({ ...account, lastSeenAt: account.sessions[0].lastSeenAt }));
    return {
        activeMinutes: ACTIVE_MINUTES,
        totals: {
            sessions: live.length,
            users: list.length,
            activeNow: list.filter(account => new Date(account.lastSeenAt) > activeSince).length,
            usedToday: today?.users?.length ?? 0,
        },
        users: list,
    };
};
