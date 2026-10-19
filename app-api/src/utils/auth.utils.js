import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import logger from '../models/logger.model.js';
import { getSessionTimeoutMs } from './session.settings.js';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export const SESSION_COOKIE = 'ds_session';

let fallbackSecret;

/**
 * Secret used to sign the session cookie. Without SESSION_SECRET a random one
 * is generated, which logs everybody out whenever the server restarts.
 */
export const getSessionSecret = () => {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    if (!fallbackSecret) {
        fallbackSecret = randomBytes(32).toString('hex');
        logger.warn('SESSION_SECRET is not set — using a temporary secret, logins will not survive a restart');
    }
    return fallbackSecret;
};

export const hashPassword = async (password) => {
    const salt = randomBytes(16).toString('hex');
    const key = await scryptAsync(password, salt, KEY_LENGTH);
    return `${salt}:${key.toString('hex')}`;
};

export const verifyPassword = async (password, stored) => {
    const [salt, hash] = (stored || '').split(':');
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== KEY_LENGTH) return false;
    const key = await scryptAsync(password, salt, KEY_LENGTH);
    return timingSafeEqual(key, expected);
};

const cookieOptions = (req) => ({
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
    path: '/',
});

/**
 * Starts (or extends) a session: it lasts the timeout the global admins set,
 * or until exp when given (a session cut to a shorter timeout). Returns when
 * it ends.
 */
export const setSessionCookie = async (req, res, user, exp = null) => {
    const expiresAt = exp ?? Date.now() + await getSessionTimeoutMs();
    res.cookie(
        SESSION_COOKIE,
        { uid: String(user._id), v: user.sessionVersion, exp: expiresAt },
        { ...cookieOptions(req), maxAge: Math.max(0, expiresAt - Date.now()) }
    );
    return expiresAt;
};

export const clearSessionCookie = (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req));
};

/**
 * Returns the session payload of a request, or null when there is no valid,
 * unexpired session cookie.
 */
export const readSession = (req) => {
    const session = req.signedCookies?.[SESSION_COOKIE];
    if (!session || typeof session !== 'object') return null;
    if (typeof session.uid !== 'string' || typeof session.exp !== 'number') return null;
    if (session.exp < Date.now()) return null;
    return session;
};
