import { normalizeGamePreferences } from '../rules/club.rules.js';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { LANGUAGES, ROLES } from '../models/user.model.js';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '../utils/auth.utils.js';
import { getSessionSettings } from '../utils/session.settings.js';
import { ageOn, selfBirthAge } from '../utils/birth.rules.js';
import { hashToken, issuePasswordLink, RESET_TOKEN_HOURS } from '../utils/auth.tokens.js';
import { isMailConfigured } from '../utils/mail.utils.js';
import { sendTemplateMail, validityOf } from '../utils/mail.service.js';
import { checkRegistration, noteRegistration, noteLoginFailure, noteResetRequest, checkLater } from '../utils/spam.guard.js';
import { normalizeLayout } from '../utils/dashboard.layout.js';
import { getClubRole } from '../middleware/auth.middleware.js';
import { notifySecurity } from '../utils/notify.js';
import { claimOnRegister } from './player.contact.controller.js';

export const BLOCKED_MESSAGE = 'This account is blocked. Please contact the administrator of this installation.';

const User = db.user;

export const register = async (req, res) => {
    logger.debug('auth register called');
    const { email, password, firstname, lastname, language } = req.body;

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
        language: LANGUAGES.includes(language) ? language : null,
        // registering logs in
        lastLoginAt: new Date(),
    });
    logger.info(`Registered user ${user.email}`);
    checkLater(() => noteRegistration(req, user));
    // registered with a claim link: the account takes over the player
    const claimed = req.body.claimToken ? await claimOnRegister(req.body.claimToken, user) : false;

    await setSessionCookie(req, res, user);
    res.status(201).json({ ...user.toJSON(), claimed });
};

export const login = async (req, res) => {
    logger.debug('auth login called');
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    // Same answer for an unknown email and a wrong password
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        checkLater(() => noteLoginFailure(req, typeof email === 'string' ? email : '', user));
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

/**
 * The user's own dashboard in a club: { layout: [{ id, size }] }, or
 * { layout: null } to go back to the club's. Only in a club they belong to.
 */
export const setDashboard = async (req, res) => {
    const club = db.mongoose.isValidObjectId(req.params.clubId) ? await db.club.findById(req.params.clubId) : null;
    if (!club || !(await getClubRole(req.user, club))) return res.status(404).json({ message: 'Club not found.' });
    const others = (req.user.dashboards ?? []).filter(entry => String(entry.club) !== String(club._id));
    req.user.dashboards = Array.isArray(req.body.layout)
        ? [...others, { club: club._id, layout: normalizeLayout(req.body.layout) }]
        : others;
    await req.user.save();
    res.json(req.user);
};

// the language of the app, saved on the account: { language }
export const setLanguage = async (req, res) => {
    req.user.language = req.body.language;
    await req.user.save();
    res.json(req.user);
};

/**
 * The player's own preferences for playing, merged into what they had:
 * whatever does not fit is left out (see rules/club.rules.js).
 */
export const setGamePreferences = async (req, res) => {
    const merged = { ...normalizeGamePreferences(req.user.gamePreferences), ...(req.body ?? {}) };
    // the setups are merged per club, so saving one game's setup keeps the others
    if (req.body?.setups) {
        const before = normalizeGamePreferences(req.user.gamePreferences).setups;
        merged.setups = { ...before };
        for (const [clubId, games] of Object.entries(req.body.setups ?? {})) merged.setups[clubId] = { ...before[clubId], ...games };
    }
    req.user.gamePreferences = normalizeGamePreferences(merged);
    req.user.markModified('gamePreferences');
    await req.user.save();
    res.json(req.user.toJSON());
};

export const updateMe = async (req, res) => {
    logger.debug('auth update profile called');
    const { email, firstname, lastname, startPage, defaultClub } = req.body;

    if (email !== req.user.email && await User.exists({ email })) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // the default club is one the user runs or plays in (null: the one used last)
    if (defaultClub) {
        const member = await db.club.exists({ _id: defaultClub, admins: req.user._id })
            || await db.player.exists({ user: req.user._id, clubs: defaultClub });
        if (!member) return res.status(422).json({ errors: ['Choose one of your clubs.'] });
    }
    const previousEmail = req.user.email;
    Object.assign(req.user, { email, firstname, lastname }, startPage ? { startPage } : {}, defaultClub !== undefined ? { defaultClub: defaultClub || null } : {});
    await req.user.save();
    // the players of the account carry its name
    await db.player.updateMany({ user: req.user._id }, { $set: { firstname: req.user.firstname, lastname: req.user.lastname } });
    if (previousEmail !== req.user.email) {
        const notice = { title: 'Your email address was changed', body: `From ${previousEmail} to ${req.user.email}. If that was not you, tell the admins of your club right away.`, vars: { oldEmail: previousEmail, newEmail: req.user.email } };
        notifySecurity(req.user, 'emailChanged', { ...notice, to: previousEmail });
    }
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
        country: player.country ?? '',
        dateOfBirth: player.dateOfBirth ?? null,
        publicProfile: Boolean(player.publicProfile),
        privateTrainings: Boolean(player.privateTrainings),
        preferences: { favouriteDouble: 'auto', mainTreble: 'auto', flyingDarts: false, flightColor: 'auto', flightPattern: 'plain', flightShape: 'standard', barrel: 'classic', ...(player.preferences ?? {}) },
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

    notifySecurity(req.user, 'passwordChanged', { title: 'Your password was changed', body: 'If that was not you, choose a new password right away and tell the admins of your club.' });
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
    checkLater(() => noteResetRequest(req, typeof req.body.email === 'string' ? req.body.email : '', user));
    if (user) {
        const link = issuePasswordLink(user, RESET_TOKEN_HOURS);
        await user.save();
        // Mail problems are logged, not shown: the answer must not reveal whether the account exists
        sendTemplateMail('passwordReset', user.email, { firstname: user.firstname, link, validity: validityOf(RESET_TOKEN_HOURS, user.language ?? 'en') }, user.language ?? 'en')
            .catch(err => logger.error(err, 'Failed to send password reset mail'));
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
    // not for a new account choosing its first password
    if (user.lastLoginAt) notifySecurity(user, 'passwordChanged', { title: 'Your password was changed', body: 'If that was not you, choose a new password right away and tell the admins of your club.' });

    await setSessionCookie(req, res, user);
    res.json(user);
};
