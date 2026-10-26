import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { verifyPassword } from '../utils/auth.utils.js';
import { notifySecurity } from '../utils/notify.js';
import { noteLoginFailure } from '../utils/spam.guard.js';
import { MAX_PASSKEYS, deviceName, newPasskeyUserId, passkeysOf, relyingParty, setChallenge, takeChallenge } from '../utils/passkeys.js';
import { startSession } from './mfa.controller.js';
import { BLOCKED_MESSAGE } from './auth.controller.js';

/**
 * Passkeys (see utils/passkeys.js): adding one to the account (with the
 * password, so a device left logged in cannot add a way in), the list,
 * removing one, and logging in with one. A passkey is two steps by itself
 * (the device and the fingerprint, face or PIN), so its login asks no code.
 */

const NO_ADDRESS = 'Passkeys need the address of the installation (APP_URL).';
const FAILED = 'The passkey could not be checked. Please try again.';

const bytesOf = (base64url) => new Uint8Array(Buffer.from(base64url, 'base64url'));

export const list = async (req, res) => res.json({ passkeys: passkeysOf(req.user) });

// a passkey to add: the password first, then the options for the browser
export const registrationOptions = async (req, res) => {
    const user = req.user;
    if (!(await verifyPassword(req.body.password, user.passwordHash))) return res.status(403).json({ message: 'The current password is wrong.' });
    if ((user.passkeys ?? []).length >= MAX_PASSKEYS) return res.status(409).json({ message: 'You have the most passkeys already. Remove one first.' });
    const rp = relyingParty(req);
    if (!rp) return res.status(409).json({ message: NO_ADDRESS });
    if (!user.passkeyUserId) {
        user.passkeyUserId = newPasskeyUserId();
        await user.save({ timestamps: false });
    }
    const options = await generateRegistrationOptions({
        rpName: rp.name,
        rpID: rp.id,
        userName: user.email,
        userDisplayName: `${user.firstname} ${user.lastname}`.trim(),
        userID: Buffer.from(user.passkeyUserId, 'base64url'),
        attestationType: 'none',
        // the device's own lock (fingerprint, face, PIN), kept on the device or in the account of its maker
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        excludeCredentials: (user.passkeys ?? []).map(passkey => ({ id: passkey.credentialId, transports: passkey.transports })),
    });
    setChallenge(req, res, 'register', options.challenge, String(user._id));
    res.json(options);
};

// the passkey the browser made: checked, then kept with the account
export const register = async (req, res) => {
    const user = req.user;
    const waiting = takeChallenge(req, res, 'register');
    if (!waiting || waiting.uid !== String(user._id)) return res.status(409).json({ message: 'Adding the passkey took too long. Please start again.' });
    const rp = relyingParty(req);
    if (!rp) return res.status(409).json({ message: NO_ADDRESS });
    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: req.body.response,
            expectedChallenge: waiting.challenge,
            expectedOrigin: rp.origin,
            expectedRPID: rp.id,
            requireUserVerification: true,
        });
    } catch (err) {
        logger.warn(`A passkey of ${user.email} could not be added: ${err.message}`);
        return res.status(400).json({ message: FAILED });
    }
    if (!verification.verified) return res.status(400).json({ message: FAILED });
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    if (await db.user.exists({ 'passkeys.credentialId': credential.id })) return res.status(409).json({ message: 'This passkey is added already.' });
    const name = typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim().slice(0, 40) : deviceName(req.get('user-agent'));
    user.passkeys.push({
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        name,
        createdAt: new Date(),
    });
    await user.save({ timestamps: false });
    logger.info(`${user.email} added a passkey (${name})`);
    notifySecurity(user, 'passkeyAdded', {
        title: 'A passkey was added',
        body: 'Your account can now be opened with the fingerprint, face or PIN of a device. If that was not you, remove it under Profile → Account and change your password.',
        template: 'securityNotice',
    });
    res.status(201).json({ passkeys: passkeysOf(user) });
};

export const remove = async (req, res) => {
    const user = req.user;
    const before = (user.passkeys ?? []).length;
    user.passkeys = (user.passkeys ?? []).filter(passkey => passkey.credentialId !== req.params.id);
    if (user.passkeys.length === before) return res.status(404).json({ message: 'There is no such passkey.' });
    await user.save({ timestamps: false });
    logger.info(`${user.email} removed a passkey`);
    notifySecurity(user, 'passkeyRemoved', {
        title: 'A passkey was removed',
        body: 'One of your passkeys no longer opens your account. If that was not you, change your password right away.',
        template: 'securityNotice',
    });
    res.json({ passkeys: passkeysOf(user) });
};

// a login with a passkey: the options for the browser, which offers the passkeys of this website
export const loginOptions = async (req, res) => {
    const rp = relyingParty(req);
    if (!rp) return res.status(409).json({ message: NO_ADDRESS });
    const options = await generateAuthenticationOptions({ rpID: rp.id, userVerification: 'required' });
    setChallenge(req, res, 'login', options.challenge);
    res.json(options);
};

// the passkey the browser answered with: its account, checked, then the session starts
export const login = async (req, res) => {
    const waiting = takeChallenge(req, res, 'login');
    if (!waiting) return res.status(409).json({ message: 'The login took too long. Please try again.' });
    const rp = relyingParty(req);
    if (!rp) return res.status(409).json({ message: NO_ADDRESS });
    const credentialId = typeof req.body.response?.id === 'string' ? req.body.response.id : '';
    const user = credentialId ? await db.user.findOne({ 'passkeys.credentialId': credentialId }) : null;
    const passkey = user?.passkeys.find(entry => entry.credentialId === credentialId);
    // the same answer for an unknown passkey and one that does not check out
    const refuse = () => res.status(401).json({ message: 'This passkey does not open an account here. Log in with your password, and add the passkey under Profile → Account.' });
    if (!passkey) return refuse();
    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response: req.body.response,
            expectedChallenge: waiting.challenge,
            expectedOrigin: rp.origin,
            expectedRPID: rp.id,
            credential: { id: passkey.credentialId, publicKey: bytesOf(passkey.publicKey), counter: passkey.counter, transports: passkey.transports },
            requireUserVerification: true,
        });
    } catch (err) {
        logger.warn(`A passkey login of ${user.email} failed: ${err.message}`);
        noteLoginFailure(req, user.email, user).catch(() => {});
        return refuse();
    }
    if (!verification.verified) return refuse();
    if (user.blockedAt) return res.status(403).json({ message: BLOCKED_MESSAGE, blocked: true });
    passkey.counter = verification.authenticationInfo.newCounter;
    passkey.lastUsedAt = new Date();
    passkey.backedUp = verification.authenticationInfo.credentialBackedUp;
    logger.info(`${user.email} logged in with a passkey (${passkey.name})`);
    return startSession(req, res, user);
};
