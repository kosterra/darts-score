import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import logger from '../models/logger.model.js';
import { getSessionTimeoutMs } from './session.settings.js';
import { recordSession } from './sessions.js';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
// scrypt work factors. N is raised from Node's default 2^14 to 2^15; maxmem is
// set explicitly because that cost needs more than scrypt's default 32 MB
// ceiling. Older hashes (the salt:hash format) still verify with the defaults
// and are re-hashed to this format on the next login (see needsRehash).
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const maxmemFor = ({ N, r, p }) => Math.max(SCRYPT.maxmem, 256 * N * r * p);

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
    const key = await scryptAsync(password, salt, KEY_LENGTH, SCRYPT);
    return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${key.toString('hex')}`;
};

export const verifyPassword = async (password, stored) => {
    const value = stored || '';
    let salt, hash, opts;
    if (value.startsWith('scrypt$')) {
        const parts = value.split('$'); // scrypt, N, r, p, salt, hash
        if (parts.length !== 6) return false;
        const [, N, r, p, s, h] = parts;
        if (!s || !h) return false;
        opts = { N: Number(N), r: Number(r), p: Number(p) };
        if (![opts.N, opts.r, opts.p].every(Number.isInteger)) return false;
        opts.maxmem = maxmemFor(opts);
        salt = s; hash = h;
    } else {
        // the earlier format: salt:hash, hashed with scrypt's defaults (N=2^14)
        [salt, hash] = value.split(':');
        if (!salt || !hash) return false;
    }
    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== KEY_LENGTH) return false;
    let key;
    try {
        key = opts ? await scryptAsync(password, salt, KEY_LENGTH, opts) : await scryptAsync(password, salt, KEY_LENGTH);
    } catch {
        return false;
    }
    return key.length === expected.length && timingSafeEqual(key, expected);
};

/**
 * Whether a stored hash is older or weaker than the ones we make now, so it
 * should be re-hashed on the next successful login.
 */
export const needsRehash = (stored) => {
    const value = stored || '';
    if (!value.startsWith('scrypt$')) return true;
    const [, N, r, p] = value.split('$');
    return Number(N) < SCRYPT.N || Number(r) < SCRYPT.r || Number(p) < SCRYPT.p;
};

export const cookieOptions = (req) => ({
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
    path: '/',
});

/**
 * Starts (or extends) a session: it lasts the timeout the global admins set,
 * or until exp when given (a session cut to a shorter timeout). Returns when
 * it ends. login: a new login, with a session of its own (also on a device
 * that had one); otherwise the session of the cookie goes on.
 */
export const setSessionCookie = async (req, res, user, exp = null, { login = false } = {}) => {
    const expiresAt = exp ?? Date.now() + await getSessionTimeoutMs();
    const current = readSession(req);
    const own = current?.uid === String(user._id) && typeof current.sid === 'string' ? current.sid : null;
    const sid = await recordSession(req, user, expiresAt, { sid: login ? null : own, login });
    res.cookie(
        SESSION_COOKIE,
        { uid: String(user._id), v: user.sessionVersion, exp: expiresAt, sid },
        { ...cookieOptions(req), maxAge: Math.max(0, expiresAt - Date.now()) }
    );
    return expiresAt;
};

export const clearSessionCookie = (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req));
};

// ---------------------------------------------------------------------------
// Two-step login: a login waiting for its code (or for setting it up), and
// the devices where the code is not asked again
// ---------------------------------------------------------------------------

export const PENDING_COOKIE = 'ds_mfa';
export const TRUST_COOKIE = 'ds_trust';

/**
 * A login whose password was right, waiting for the second step: 'code' (a
 * code of the app or a recovery code) or 'enroll' (setting it up first).
 */
export const setPendingCookie = (req, res, user, step, minutes = 5) => {
    const exp = Date.now() + minutes * 60 * 1000;
    res.cookie(PENDING_COOKIE, { uid: String(user._id), v: user.sessionVersion, step, exp }, { ...cookieOptions(req), maxAge: minutes * 60 * 1000 });
};

export const readPending = (req) => {
    const pending = req.signedCookies?.[PENDING_COOKIE];
    if (!pending || typeof pending !== 'object' || typeof pending.uid !== 'string' || typeof pending.exp !== 'number') return null;
    return pending.exp < Date.now() ? null : pending;
};

export const clearPendingCookie = (req, res) => res.clearCookie(PENDING_COOKIE, cookieOptions(req));

export const setTrustCookie = (req, res, user, days) => {
    const exp = Date.now() + days * 24 * 60 * 60 * 1000;
    res.cookie(TRUST_COOKIE, { uid: String(user._id), t: user.mfa?.trustSalt ?? '', exp }, { ...cookieOptions(req), maxAge: days * 24 * 60 * 60 * 1000 });
};

// whether this device was trusted by the account, and still is
export const isTrustedDevice = (req, user) => {
    const trust = req.signedCookies?.[TRUST_COOKIE];
    return Boolean(trust && typeof trust === 'object' && trust.uid === String(user._id) && user.mfa?.trustSalt && trust.t === user.mfa.trustSalt && trust.exp > Date.now());
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
