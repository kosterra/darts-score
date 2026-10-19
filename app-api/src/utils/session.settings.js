import db from '../models/db.model.js';

// How long a login lasts before it has to be extended or renewed, set by the
// global admins (one setting, "session"); five hours cover a long darts evening.
const KEY = 'session';
export const SESSION_HOURS = { default: 5, min: 1, max: 24 };
const HOUR_MS = 60 * 60 * 1000;
// read at most once a minute, every request needs it
const CACHE_MS = 60 * 1000;

let cached = null;

const hoursOf = (value) => {
    const hours = Number(value?.timeoutHours);
    return Number.isInteger(hours) && hours >= SESSION_HOURS.min && hours <= SESSION_HOURS.max ? hours : SESSION_HOURS.default;
};

/**
 * The session settings: { timeoutHours }.
 */
export const getSessionSettings = async () => {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.settings;
    const setting = await db.setting.findOne({ key: KEY }).lean();
    const settings = { timeoutHours: hoursOf(setting?.value) };
    cached = { at: Date.now(), settings };
    return settings;
};

export const getSessionTimeoutMs = async () => (await getSessionSettings()).timeoutHours * HOUR_MS;

export const saveSessionSettings = async ({ timeoutHours }) => {
    const settings = { timeoutHours: hoursOf({ timeoutHours }) };
    await db.setting.updateOne({ key: KEY }, { $set: { value: settings } }, { upsert: true });
    cached = { at: Date.now(), settings };
    return settings;
};

/**
 * When a session ends: never later than the timeout from now, so a shorter
 * timeout also cuts sessions that were started before it (and the 30-day
 * cookies of older versions). Returns the expiry and whether it was cut.
 */
export const cappedExpiry = (exp, now, timeoutMs) => {
    const latest = now + timeoutMs;
    return exp > latest ? { exp: latest, cut: true } : { exp, cut: false };
};
