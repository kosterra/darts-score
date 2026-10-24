import { randomBytes } from 'node:crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import {
    clearPendingCookie, isTrustedDevice, readPending, setPendingCookie, setSessionCookie, setTrustCookie, verifyPassword,
} from '../utils/auth.utils.js';
import {
    PENDING_MINUTES, TRUST_DAYS, checkCode, clearTries, decrypt, encrypt, isMfaEnabled, mfaStateOf, newRecoveryCodes,
    newSecret, noteWrongCode, otpauthUri, recoveryIndex, requirementOf, tooManyTries,
} from '../utils/mfa.js';
import { notifySecurity } from '../utils/notify.js';
import { noteLoginFailure } from '../utils/spam.guard.js';

/**
 * Two-step login (see utils/mfa.js): the second step of logging in, setting
 * it up (also as part of a login when it is required), turning it off, new
 * recovery codes and forgetting trusted devices.
 */

// the session starts: the login is complete
const startSession = async (req, res, user, { status = 200, extra = {} } = {}) => {
    user.lastLoginAt = new Date();
    await user.save({ timestamps: false });
    clearPendingCookie(req, res);
    await setSessionCookie(req, res, user);
    res.status(status).json({ ...user.toJSON(), ...extra, mfa: await mfaStateOf(user) });
};

/**
 * The end of every way to log in (the password, a reset or invitation link,
 * registering): with two-step login on, the code is asked first (unless the
 * device is trusted); when it is required and the days to set it up are
 * over, it is set up first. Otherwise the session starts.
 */
export const finishLogin = async (req, res, user, options = {}) => {
    if (isMfaEnabled(user)) {
        if (isTrustedDevice(req, user)) return startSession(req, res, user, options);
        setPendingCookie(req, res, user, 'code', PENDING_MINUTES);
        return res.status(options.status ?? 200).json({ mfaRequired: true, step: 'code', ...options.extra });
    }
    if ((await mfaStateOf(user)).mustSetUp) {
        // a little longer: scanning the code and typing the first one takes a moment
        setPendingCookie(req, res, user, 'enroll', 3 * PENDING_MINUTES);
        return res.status(options.status ?? 200).json({ mfaRequired: true, step: 'enroll', ...options.extra });
    }
    return startSession(req, res, user, options);
};

// the account of a login waiting for its second step, or null
const pendingUser = async (req, step) => {
    const pending = readPending(req);
    if (!pending || (step && pending.step !== step)) return null;
    const user = await db.user.findById(pending.uid);
    if (!user || user.sessionVersion !== pending.v || user.blockedAt) return null;
    return user;
};

// the account: logged in, or (while setting it up as part of a login) waiting
const accountOf = async (req) => req.user ?? pendingUser(req, 'enroll');

const EXPIRED = 'The login took too long. Please log in again.';

/**
 * The second step of logging in: { code } from the app or { recoveryCode },
 * and { trust } to not be asked again on this device for TRUST_DAYS days.
 */
export const loginCode = async (req, res) => {
    const user = await pendingUser(req, 'code');
    if (!user) return res.status(401).json({ message: EXPIRED, expired: true });
    if (tooManyTries(user._id)) return res.status(429).json({ message: 'Too many wrong codes. Please wait a few minutes and log in again.' });

    const secret = decrypt(user.mfa.secret);
    const { code, recoveryCode, trust } = req.body;
    let usedRecovery = false;
    if (recoveryCode) {
        const index = recoveryIndex(user.mfa.recoveryHashes, recoveryCode);
        if (index < 0) return wrongCode(req, res, user);
        user.mfa.recoveryHashes.splice(index, 1);
        usedRecovery = true;
    } else {
        const step = checkCode(secret, code, user.mfa.lastStep);
        if (step === null) return wrongCode(req, res, user);
        user.mfa.lastStep = step;
    }
    clearTries(user._id);
    if (trust === true) {
        if (!user.mfa.trustSalt) user.mfa.trustSalt = randomBytes(12).toString('base64url');
        setTrustCookie(req, res, user, TRUST_DAYS);
    }
    if (usedRecovery) {
        const left = user.mfa.recoveryHashes.length;
        notifySecurity(user, 'mfaRecoveryUsed', {
            title: 'A recovery code was used to log in',
            body: `${left} recovery codes are left. If that was not you, change your password and tell the admins of your club right away.`,
            template: 'securityNotice',
        });
    }
    return startSession(req, res, user);
};

const wrongCode = (req, res, user) => {
    noteWrongCode(user._id);
    noteLoginFailure(req, user.email, user).catch(() => {});
    return res.status(401).json({ message: 'This code is not right. Check the time of your phone and try the newest code.' });
};

/**
 * The two-step login of the account: { enabled, required, setupDue, recoveryLeft, enabledAt }.
 */
export const status = async (req, res) => res.json(await mfaStateOf(req.user));

/**
 * Starts setting it up: a new secret for the authenticator app, as its key
 * and the address for the QR code: { secret, uri }.
 */
export const setup = async (req, res) => {
    const user = await accountOf(req);
    if (!user) return res.status(401).json({ message: EXPIRED, expired: true });
    if (isMfaEnabled(user)) return res.status(409).json({ message: 'Two-step login is on already.' });
    const secret = newSecret();
    user.mfa.pendingSecret = encrypt(secret);
    await user.save({ timestamps: false });
    res.json({ secret, uri: otpauthUri(user.email, secret) });
};

/**
 * Turns it on with the first code of the app: { code, trust }. Answers the
 * recovery codes, shown once; while logging in, the session starts too.
 */
export const enable = async (req, res) => {
    const user = await accountOf(req);
    if (!user) return res.status(401).json({ message: EXPIRED, expired: true });
    if (isMfaEnabled(user)) return res.status(409).json({ message: 'Two-step login is on already.' });
    const secret = decrypt(user.mfa.pendingSecret);
    if (!secret) return res.status(409).json({ message: 'Start setting it up again.' });
    const step = checkCode(secret, req.body.code);
    if (step === null) return res.status(422).json({ errors: ['This code is not right. Check the time of your phone and try the newest code.'] });

    const { codes, hashes } = newRecoveryCodes();
    Object.assign(user.mfa, { secret: user.mfa.pendingSecret, pendingSecret: null, enabledAt: new Date(), lastStep: step, recoveryHashes: hashes, trustSalt: randomBytes(12).toString('base64url') });
    notifySecurity(user, 'mfaEnabled', {
        title: 'Two-step login is on',
        body: 'From now on Oche asks for a code of your authenticator app after the password. Keep your recovery codes in a safe place.',
        template: 'securityNotice',
    });
    logger.info(`${user.email} turned on two-step login`);
    if (req.body.trust === true) setTrustCookie(req, res, user, TRUST_DAYS);
    if (!req.user) return startSession(req, res, user, { extra: { recoveryCodes: codes } });
    await user.save({ timestamps: false });
    res.json({ recoveryCodes: codes, mfa: await mfaStateOf(user) });
};

/**
 * Turns it off: { password, code }. Not while it is required for the account.
 */
export const disable = async (req, res) => {
    const user = req.user;
    if (!isMfaEnabled(user)) return res.status(409).json({ message: 'Two-step login is off already.' });
    if ((await requirementOf(user)).required) return res.status(409).json({ message: 'Two-step login is required for your account on this installation.' });
    if (!(await verifyPassword(req.body.password, user.passwordHash))) return res.status(403).json({ message: 'The current password is wrong.' });
    if (checkCode(decrypt(user.mfa.secret), req.body.code, user.mfa.lastStep) === null) return res.status(403).json({ message: 'This code is not right. Check the time of your phone and try the newest code.' });
    user.mfa = { secret: null, pendingSecret: null, enabledAt: null, lastStep: null, recoveryHashes: [], trustSalt: null };
    await user.save({ timestamps: false });
    notifySecurity(user, 'mfaDisabled', {
        title: 'Two-step login is off',
        body: 'Oche no longer asks for a code after the password. If that was not you, change your password and tell the admins of your club right away.',
        template: 'securityNotice',
    });
    logger.info(`${user.email} turned off two-step login`);
    res.json({ mfa: await mfaStateOf(user) });
};

/**
 * New recovery codes with a current code: { code } → { recoveryCodes }. The old ones stop working.
 */
export const recoveryCodes = async (req, res) => {
    const user = req.user;
    if (!isMfaEnabled(user)) return res.status(409).json({ message: 'Two-step login is off.' });
    const step = checkCode(decrypt(user.mfa.secret), req.body.code, user.mfa.lastStep);
    if (step === null) return res.status(403).json({ message: 'This code is not right. Check the time of your phone and try the newest code.' });
    const { codes, hashes } = newRecoveryCodes();
    user.mfa.recoveryHashes = hashes;
    user.mfa.lastStep = step;
    await user.save({ timestamps: false });
    res.json({ recoveryCodes: codes, mfa: await mfaStateOf(user) });
};

// every device where the code is not asked asks again
export const forgetDevices = async (req, res) => {
    const user = req.user;
    if (!isMfaEnabled(user)) return res.status(409).json({ message: 'Two-step login is off.' });
    user.mfa.trustSalt = randomBytes(12).toString('base64url');
    await user.save({ timestamps: false });
    res.json({ message: 'Every device asks for the code again.' });
};

/**
 * A global admin resets the two-step login of an account whose phone is
 * lost: off, its sessions end, and with the policy it is set up again at
 * the next login. Raises an alert, it is what an attacker would want too.
 */
export const resetForUser = async (req, res) => {
    const user = await db.user.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user._id.equals(req.user._id)) return res.status(409).json({ message: 'Change your own account in your profile.' });
    if (!isMfaEnabled(user)) return res.status(409).json({ message: 'Two-step login is off for this account.' });
    user.mfa = { secret: null, pendingSecret: null, enabledAt: null, lastStep: null, recoveryHashes: [], trustSalt: null };
    user.sessionVersion += 1;
    await user.save({ timestamps: false });
    logger.warn(`Two-step login of ${user.email} reset by ${req.user.email}`);
    const { raiseAlert, clientIp } = await import('../utils/spam.guard.js');
    raiseAlert({ rule: 'mfaReset', message: `${req.user.email} reset the two-step login of ${user.email}`, subject: { type: 'Account', id: user._id, name: user.email }, user, ip: clientIp(req) }).catch(() => {});
    notifySecurity(user, 'mfaReset', {
        title: 'Your two-step login was reset',
        body: 'A global admin turned it off, e.g. for a lost phone. Set it up again on your profile. If you did not ask for this, tell the admins of your club right away.',
        template: 'securityNotice',
    });
    res.json(user.toJSON());
};
