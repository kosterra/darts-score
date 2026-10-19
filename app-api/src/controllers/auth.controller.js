import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '../utils/auth.utils.js';
import { getSessionSettings } from '../utils/session.settings.js';
import { ageOn, selfBirthAge } from '../utils/birth.rules.js';
import { hashToken, issuePasswordLink, RESET_TOKEN_HOURS } from '../utils/auth.tokens.js';
import { isMailConfigured, sendMail } from '../utils/mail.utils.js';
import { checkRegistration, noteRegistration, checkLater } from '../utils/spam.guard.js';

export const BLOCKED_MESSAGE = 'This account is blocked. Please contact the administrator of this installation.';

const User = db.user;

export const register = async (req, res) => {
    logger.debug('auth register called');
    const { email, password, firstname, lastname } = req.body;

    const refused = await checkRegistration(req);
    if (refused) return res.status(refused.status).json({ message: refused.message });

    if (await User.exists({ email })) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({
        email,
        firstname,
        lastname,
        passwordHash: await hashPassword(password),
        role: ROLES.USER,
    });
    logger.info(`Registered user ${user.email}`);
    checkLater(() => noteRegistration(req, user));

    await setSessionCookie(req, res, user);
    res.status(201).json(user);
};

export const login = async (req, res) => {
    logger.debug('auth login called');
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    // Same answer for an unknown email and a wrong password
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ message: 'Email or password is wrong.' });
    }
    if (user.blockedAt) return res.status(403).json({ message: BLOCKED_MESSAGE, blocked: true });

    user.lastLoginAt = new Date();
    await user.save({ timestamps: false });
    await setSessionCookie(req, res, user);
    res.json(user);
};

export const logout = (req, res) => {
    clearSessionCookie(req, res);
    res.json({ message: 'Logged out.' });
};

export const me = (req, res) => res.json(req.user);

// when the session ends, so the app can warn in time: { expiresAt, timeoutHours }
export const session = async (req, res) => {
    const { timeoutHours } = await getSessionSettings();
    res.json({ expiresAt: req.sessionExpiresAt, timeoutHours });
};

// a session about to end goes on for the full timeout from now: { expiresAt }
export const extendSession = async (req, res) => {
    const expiresAt = await setSessionCookie(req, res, req.user);
    res.json({ expiresAt });
};

export const updateMe = async (req, res) => {
    logger.debug('auth update profile called');
    const { email, firstname, lastname, startPage } = req.body;

    if (email !== req.user.email && await User.exists({ email })) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    Object.assign(req.user, { email, firstname, lastname }, startPage ? { startPage } : {});
    await req.user.save();
    // the players of the account carry its name
    await db.player.updateMany({ user: req.user._id }, { $set: { firstname: req.user.firstname, lastname: req.user.lastname } });
    res.json(req.user);
};

/**
 * The players the user plays as, with their clubs, for the player profile:
 * [{ id, nickname, firstname, lastname, profileImg, dateOfBirth, publicProfile,
 * preferences, clubs: [{ id, name, logo, isPublic }] }].
 */
export const myPlayers = async (req, res) => {
    const players = await db.player.find({ user: req.user._id, guest: { $ne: true } })
        .populate('clubs', 'name logo isPublic shameMinAge')
        .lean();
    res.json(players.map(player => ({
        id: String(player._id),
        nickname: player.nickname,
        firstname: player.firstname,
        lastname: player.lastname,
        profileImg: player.profileImg ?? '',
        dateOfBirth: player.dateOfBirth ?? null,
        publicProfile: Boolean(player.publicProfile),
        preferences: { favouriteDouble: 'auto', mainTreble: 'auto', ...(player.preferences ?? {}) },
        user: String(player.user),
        // adults correct their date of birth themselves once the admins set it
        birthMinAge: selfBirthAge(player.clubs ?? []),
        birthEditable: Boolean(player.dateOfBirth) && ageOn(player.dateOfBirth) >= selfBirthAge(player.clubs ?? []),
        clubs: (player.clubs ?? []).filter(Boolean).map(club => ({ id: String(club._id), name: club.name, logo: club.logo ?? '', isPublic: Boolean(club.isPublic) })),
    })));
};

export const changePassword = async (req, res) => {
    logger.debug('auth change password called');
    const { currentPassword, newPassword } = req.body;

    if (!(await verifyPassword(currentPassword, req.user.passwordHash))) {
        return res.status(403).json({ message: 'The current password is wrong.' });
    }

    req.user.passwordHash = await hashPassword(newPassword);
    req.user.sessionVersion += 1;
    await req.user.save();

    // Other devices are logged out by the version bump; keep this one signed in
    await setSessionCookie(req, res, req.user);
    res.json({ message: 'Password changed.' });
};

/**
 * What the login pages need to know before anyone is logged in.
 */
export const config = (req, res) => res.json({ mailEnabled: isMailConfigured() });

export const forgotPassword = async (req, res) => {
    logger.debug('auth forgot password called');
    if (!isMailConfigured()) {
        return res.status(503).json({ message: 'Email sending is not set up. Ask an admin to reset your password.' });
    }

    const user = await User.findOne({ email: req.body.email });
    if (user) {
        const link = issuePasswordLink(user, RESET_TOKEN_HOURS);
        await user.save();
        // Mail problems are logged, not shown: the answer must not reveal whether the account exists
        sendMail({
            to: user.email,
            subject: 'Reset your Oche password',
            text: `Hello ${user.firstname},\n\nuse this link to choose a new password. It works once and for ${RESET_TOKEN_HOURS} hour:\n\n${link}\n\nIf you did not ask for this, you can ignore this mail.\n`,
        }).catch(err => logger.error(err, 'Failed to send password reset mail'));
    }

    res.json({ message: 'If an account with this email exists, a reset link is on its way.' });
};

export const resetPassword = async (req, res) => {
    logger.debug('auth reset password called');
    const user = await User.findOne({
        resetTokenHash: hashToken(req.body.token),
        resetTokenExpires: { $gt: new Date() },
    });
    if (!user) {
        return res.status(400).json({ message: 'This link is invalid or has expired. Please request a new one.' });
    }

    user.passwordHash = await hashPassword(req.body.password);
    user.sessionVersion += 1;
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();

    await setSessionCookie(req, res, user);
    res.json(user);
};
