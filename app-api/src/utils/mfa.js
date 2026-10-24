import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { authenticator } from 'otplib';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { getSessionSecret } from './auth.utils.js';

/**
 * Two-step login: after the password, a code from an authenticator app
 * (TOTP, RFC 6238) or one of ten recovery codes. The secret is kept
 * encrypted; a code is taken once. The global admins set whether it is
 * optional or required (for the admins, or for everyone, after some days).
 */

// a code of the step before or after counts too (a clock off by up to 30 s)
authenticator.options = { window: 1 };

export const ISSUER = 'Oche';
export const RECOVERY_CODES = 10;
export const TRUST_DAYS = 30;
export const PENDING_MINUTES = 5;
// wrong codes per account before it has to wait
export const CODE_TRIES = { limit: 5, windowMs: 5 * 60 * 1000 };

// ---------------------------------------------------------------------------
// The secret, encrypted with MFA_KEY (or a key from the session secret)
// ---------------------------------------------------------------------------

let warned = false;
const keyOf = () => {
    const configured = process.env.MFA_KEY;
    if (!configured && !warned) {
        warned = true;
        logger.warn('MFA_KEY is not set — the secrets of two-step login are encrypted with a key from SESSION_SECRET; changing that secret ends every two-step login');
    }
    return createHash('sha256').update(configured || `mfa:${getSessionSecret()}`).digest();
};

export const encrypt = (text) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyOf(), iv);
    const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64url')).join('.');
};

export const decrypt = (stored) => {
    try {
        const [iv, tag, data] = String(stored ?? '').split('.').map(part => Buffer.from(part, 'base64url'));
        const decipher = createDecipheriv('aes-256-gcm', keyOf(), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch {
        return null;
    }
};

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

export const newSecret = () => authenticator.generateSecret(20);

// the address an authenticator app reads from the QR code
export const otpauthUri = (email, secret) => authenticator.keyuri(email, ISSUER, secret);

const STEP_SECONDS = 30;

/**
 * The step of a valid code of the secret, or null; a code of the step used
 * last (or before) does not count again.
 */
export const checkCode = (secret, code, lastStep = null, now = Date.now()) => {
    const token = String(code ?? '').replace(/\s/g, '');
    if (!secret || !/^\d{6}$/.test(token)) return null;
    authenticator.options = { window: 1, epoch: now };
    let delta = null;
    try {
        delta = authenticator.checkDelta(token, secret);
    } finally {
        authenticator.options = { window: 1 };
    }
    if (delta === null) return null;
    const step = Math.floor(now / 1000 / STEP_SECONDS) + delta;
    return lastStep != null && step <= lastStep ? null : step;
};

// a code of the secret now (for tests)
export const codeOf = (secret, now = Date.now()) => {
    authenticator.options = { window: 1, epoch: now };
    try {
        return authenticator.generate(secret);
    } finally {
        authenticator.options = { window: 1 };
    }
};

const hashCode = (code) => createHash('sha256').update(String(code).toLowerCase().replace(/[^a-z0-9]/g, '')).digest('hex');

// ten codes like "k7m2-x9qp", and their hashes to keep
export const newRecoveryCodes = () => {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    const codes = Array.from({ length: RECOVERY_CODES }, () => {
        const chars = [...randomBytes(8)].map(byte => alphabet[byte % alphabet.length]).join('');
        return `${chars.slice(0, 4)}-${chars.slice(4)}`;
    });
    return { codes, hashes: codes.map(hashCode) };
};

// the index of the recovery code among the hashes, or -1
export const recoveryIndex = (hashes, code) => {
    const given = Buffer.from(hashCode(code));
    return (hashes ?? []).findIndex(hash => {
        const known = Buffer.from(hash);
        return known.length === given.length && timingSafeEqual(known, given);
    });
};

// ---------------------------------------------------------------------------
// The policy of the installation
// ---------------------------------------------------------------------------

export const MFA_POLICIES = ['off', 'optional', 'admins', 'everyone'];
export const GRACE_DAYS = { default: 14, min: 0, max: 60 };
const KEY = 'mfa';
const CACHE_MS = 60 * 1000;
let cached = null;

const normalize = (value = {}) => ({
    policy: MFA_POLICIES.includes(value.policy) ? value.policy : 'optional',
    graceDays: Number.isInteger(value.graceDays) && value.graceDays >= GRACE_DAYS.min && value.graceDays <= GRACE_DAYS.max ? value.graceDays : GRACE_DAYS.default,
    requiredSince: value.requiredSince ? new Date(value.requiredSince) : null,
});

/**
 * { policy, graceDays, requiredSince }: off, optional, required for the
 * admins or for everyone, with the days to set it up from requiredSince.
 */
export const getMfaSettings = async () => {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.settings;
    const settings = normalize((await db.setting.findOne({ key: KEY }).lean())?.value);
    cached = { at: Date.now(), settings };
    return settings;
};

const isRequiring = (policy) => policy === 'admins' || policy === 'everyone';

export const saveMfaSettings = async ({ policy, graceDays }) => {
    const before = await getMfaSettings();
    const next = normalize({ policy, graceDays, requiredSince: before.requiredSince });
    // the days to set it up start when it becomes required
    if (isRequiring(next.policy) && !isRequiring(before.policy)) next.requiredSince = new Date();
    if (!isRequiring(next.policy)) next.requiredSince = null;
    await db.setting.updateOne({ key: KEY }, { $set: { value: next } }, { upsert: true });
    cached = { at: Date.now(), settings: next };
    return next;
};

/**
 * Whether two-step login is required for the account, and from when:
 * { required, due } (due: until when it may still be set up later).
 */
export const requirementOf = async (user) => {
    const { policy, graceDays, requiredSince } = await getMfaSettings();
    if (!isRequiring(policy)) return { required: false, due: null };
    if (policy === 'admins' && user.role !== ROLES.GLOBAL_ADMIN && !(await db.club.exists({ admins: user._id }))) {
        return { required: false, due: null };
    }
    const due = new Date((requiredSince ? new Date(requiredSince).getTime() : Date.now()) + graceDays * 24 * 60 * 60 * 1000);
    return { required: true, due };
};

export const isMfaEnabled = (user) => Boolean(user?.mfa?.enabledAt && user?.mfa?.secret);

/**
 * What the app needs to know about the two-step login of the account:
 * { enabled, required, setupDue (a date while it may still wait), mustSetUp }.
 */
export const mfaStateOf = async (user) => {
    const enabled = isMfaEnabled(user);
    const { required, due } = await requirementOf(user);
    const waiting = required && !enabled;
    return {
        enabled,
        required,
        setupDue: waiting && due > new Date() ? due : null,
        mustSetUp: waiting && due <= new Date(),
        recoveryLeft: enabled ? (user.mfa.recoveryHashes ?? []).length : 0,
        enabledAt: enabled ? user.mfa.enabledAt : null,
    };
};

// ---------------------------------------------------------------------------
// Wrong codes, counted per account
// ---------------------------------------------------------------------------

const tries = new Map();
export const tooManyTries = (userId, now = Date.now()) => {
    const entry = tries.get(String(userId));
    return Boolean(entry && now - entry.from < CODE_TRIES.windowMs && entry.count >= CODE_TRIES.limit);
};
export const noteWrongCode = (userId, now = Date.now()) => {
    const key = String(userId);
    const entry = tries.get(key);
    if (!entry || now - entry.from >= CODE_TRIES.windowMs) tries.set(key, { from: now, count: 1 });
    else entry.count += 1;
};
export const clearTries = (userId) => tries.delete(String(userId));
