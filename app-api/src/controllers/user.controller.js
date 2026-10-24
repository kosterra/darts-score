import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES, ROLES } from '../models/user.model.js';
import { clubsOfAccount } from '../utils/global.admins.js';
import { hashPassword } from '../utils/auth.utils.js';
import { issuePasswordLink } from '../utils/auth.tokens.js';
import { notifySecurity } from '../utils/notify.js';

// how long a password link created by a global admin works
export const ADMIN_LINK_HOURS = 24;

const User = db.user;
const Club = db.club;

/**
 * Every account, with the clubs it belongs to and its role in each.
 */
export const findAll = async (req, res) => {
    logger.debug('users find all called');
    const [users, clubs, players] = await Promise.all([
        User.find({}).sort({ lastname: 1, firstname: 1 }),
        Club.find({}, 'name admins logo').lean(),
        db.player.find({ user: { $ne: null } }, 'user clubs').lean(),
    ]);
    const clubNames = new Map(clubs.map(club => [String(club._id), club.name]));
    const clubLogos = new Map(clubs.map(club => [String(club._id), club.logo ?? '']));

    const membershipsOf = (userId) => {
        const id = String(userId);
        const memberships = clubs
            .filter(club => club.admins.some(admin => String(admin) === id))
            .map(club => ({ id: club._id, name: club.name, logo: club.logo ?? '', role: CLUB_ROLES.ADMIN }));
        players
            .filter(player => String(player.user) === id)
            .flatMap(player => player.clubs ?? [])
            .filter(clubId => clubNames.has(String(clubId)) && !memberships.some(m => String(m.id) === String(clubId)))
            .forEach(clubId => memberships.push({ id: clubId, name: clubNames.get(String(clubId)), logo: clubLogos.get(String(clubId)), role: CLUB_ROLES.PLAYER }));
        return memberships.sort((a, b) => a.name.localeCompare(b.name));
    };

    res.json(users.map(user => ({ ...user.toJSON(), clubs: membershipsOf(user._id) })));
};

export const updateRole = async (req, res) => {
    logger.debug('users update role called');
    const { id } = req.params;
    if (req.user._id.equals(id)) {
        return res.status(409).json({ message: 'You cannot change your own role.' });
    }
    // a global admin belongs to no club: the account has to leave its clubs first
    if (req.body.role === ROLES.GLOBAL_ADMIN) {
        const { admin, player } = await clubsOfAccount(id);
        if (admin.length || player.length) {
            const where = [
                admin.length && `admin of ${admin.join(', ')}`,
                player.length && `player in ${player.join(', ')}`,
            ].filter(Boolean).join(' and ');
            return res.status(409).json({ message: `This user is ${where}. Global admins do not belong to a club: remove them from these clubs first.` });
        }
    }
    const user = await User.findByIdAndUpdate(id, { $set: { role: req.body.role } }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
};

export const remove = async (req, res) => {
    logger.debug('users delete called');
    const { id } = req.params;
    if (req.user._id.equals(id)) {
        return res.status(409).json({ message: 'You cannot delete your own account.' });
    }
    // A club must keep at least one admin
    if (await Club.exists({ admins: { $eq: [new db.mongoose.Types.ObjectId(id)] } })) {
        return res.status(409).json({ message: 'This user is the only admin of a club. Add another admin or delete the club first.' });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await Club.updateMany({ admins: id }, { $pull: { admins: id } });
    // Players the user played as stay in their clubs, just no longer linked
    await db.player.updateMany({ user: id }, { $set: { user: null } });
    // what they asked to join is no longer for anyone to decide
    await db.joinRequest.updateMany({ user: id, status: 'open' }, { $set: { status: 'withdrawn', decidedAt: new Date() } });
    await db.notification.deleteMany({ kind: 'joinRequested', by: id });
    logger.info(`User ${user.email} deleted by ${req.user.email}`);
    res.json({ message: 'User deleted.' });
};

// a global admin changes their own account in their profile
const refuseSelf = (req, res) => {
    if (!req.user._id.equals(req.params.id)) return false;
    res.status(409).json({ message: 'Change your own account in your profile.' });
    return true;
};

/**
 * Corrects a user's name and email address, e.g. an address that does not exist.
 */
export const update = async (req, res) => {
    logger.debug('users update called');
    if (refuseSelf(req, res)) return;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const { firstname, lastname, email } = req.body;
    if (email !== user.email && await User.exists({ email })) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const previousEmail = user.email;
    const changes = [user.email !== email && `email ${user.email} → ${email}`, (user.firstname !== firstname || user.lastname !== lastname) && 'name'].filter(Boolean);
    Object.assign(user, { firstname, lastname, email });
    await user.save();
    logger.info(`User ${user.email} edited by ${req.user.email}${changes.length ? ` (${changes.join(', ')})` : ''}`);
    if (previousEmail !== user.email) {
        const notice = { title: 'Your email address was changed', body: `From ${previousEmail} to ${user.email}. If that was not you, tell the admins of your club right away.`, vars: { oldEmail: previousEmail, newEmail: user.email } };
        notifySecurity(user, 'emailChanged', { ...notice, to: previousEmail });
    }
    res.json(user);
};

/**
 * Sets a new password for a user who cannot use "forgot password", e.g.
 * without a working email address. Their sessions end.
 */
export const setPassword = async (req, res) => {
    logger.debug('users set password called');
    if (refuseSelf(req, res)) return;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.passwordHash = await hashPassword(req.body.password);
    user.sessionVersion += 1;
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();
    logger.info(`Password of ${user.email} set by ${req.user.email}`);
    notifySecurity(user, 'passwordChanged', { title: 'Your password was changed', body: 'If that was not you, choose a new password right away and tell the admins of your club.' });
    res.json({ message: 'Password set.' });
};

/**
 * A "choose your password" link for a user, handed to the global admin
 * instead of mailed, to pass on another way. It works once and for a day.
 */
export const passwordLink = async (req, res) => {
    logger.debug('users password link called');
    if (refuseSelf(req, res)) return;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const link = issuePasswordLink(user, ADMIN_LINK_HOURS);
    await user.save();
    logger.info(`Password link for ${user.email} created by ${req.user.email}`);
    res.json({ link, validHours: ADMIN_LINK_HOURS });
};
