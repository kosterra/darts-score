import { randomBytes } from 'node:crypto';
import { cookieOptions } from './auth.utils.js';
import { getAppUrl } from './mail.utils.js';

/**
 * Passkeys (WebAuthn): logging in with the fingerprint, the face or the PIN
 * of a device instead of the password, in the browser and in the installed
 * app. Each passkey belongs to the address of the installation (APP_URL):
 * one of legmate.ch does not work on a test server elsewhere. The challenge of
 * a registration or a login waits in a short signed cookie.
 */

export const MAX_PASSKEYS = 10;
const CHALLENGE_COOKIE = 'ds_pk';
const CHALLENGE_MINUTES = 5;

// the website the passkeys belong to: its domain (rpID) and its origin, from APP_URL,
// else from the address the browser called (local development)
export const relyingParty = (req) => {
    const base = getAppUrl() || req.get('origin') || '';
    try {
        const url = new URL(base);
        return { id: url.hostname, origin: url.origin, name: 'Legmate' };
    } catch {
        return null;
    }
};

// a new id of the account for the authenticators (not its database id, which needs not travel)
export const newPasskeyUserId = () => randomBytes(16).toString('base64url');

export const setChallenge = (req, res, purpose, challenge, uid = null) => {
    const exp = Date.now() + CHALLENGE_MINUTES * 60 * 1000;
    res.cookie(CHALLENGE_COOKIE, { purpose, challenge, uid, exp }, { ...cookieOptions(req), maxAge: CHALLENGE_MINUTES * 60 * 1000 });
};

// the challenges answered already, until they would have run out anyway (in
// memory): the cookie is cleared with the answer, but a browser need not obey,
// so an answer sent twice counts once here
const used = new Map();
const pruneUsed = (now) => {
    for (const [challenge, exp] of used) if (exp < now) used.delete(challenge);
};

/**
 * The waiting challenge of a purpose ('register' or 'login'), used up by
 * reading it: a second answer with the same cookie gets null, as does a late
 * one or one for the other purpose.
 */
export const takeChallenge = (req, res, purpose) => {
    const waiting = req.signedCookies?.[CHALLENGE_COOKIE];
    res.clearCookie(CHALLENGE_COOKIE, cookieOptions(req));
    if (!waiting || typeof waiting !== 'object' || waiting.purpose !== purpose || typeof waiting.challenge !== 'string') return null;
    const now = Date.now();
    if (waiting.exp < now) return null;
    pruneUsed(now);
    if (used.has(waiting.challenge)) return null;
    used.set(waiting.challenge, waiting.exp);
    return waiting;
};

// a short name for a passkey from the browser it was made in, e.g. "iPhone" or "Windows"
export const deviceName = (userAgent = '') => {
    const agent = String(userAgent);
    if (/iPhone/.test(agent)) return 'iPhone';
    if (/iPad/.test(agent)) return 'iPad';
    if (/Android/.test(agent)) return 'Android';
    if (/Macintosh|Mac OS X/.test(agent)) return 'Mac';
    if (/Windows/.test(agent)) return 'Windows';
    if (/Linux/.test(agent)) return 'Linux';
    return 'Passkey';
};

// the passkeys of an account as the app shows them
export const passkeysOf = (user) => (user.passkeys ?? []).map(passkey => ({
    id: passkey.credentialId,
    name: passkey.name,
    synced: Boolean(passkey.backedUp),
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt ?? null,
}));
