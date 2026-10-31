import logger from '../models/logger.model.js';
import { noteCreated, noteClubTexts, checkTakeover, checkLater } from '../utils/spam.guard.js';
import db from '../models/db.model.js';
import { ROLES, CLUB_ROLES } from '../models/user.model.js';
import { findOrCreateAccount } from '../utils/accounts.js';
import { sendClubWelcomeMail } from '../utils/mail.service.js';
import { removeClubLogoFile } from './file.controller.js';
import { deleteClubData } from '../utils/club.deletion.js';
import { isGlobalAdmin, canManageClub } from '../middleware/auth.middleware.js';
import { NO_CLUB_FOR_GLOBAL_ADMINS, isGlobalAdminAccount } from '../utils/global.admins.js';
import { normalizeLayout } from '../utils/dashboard.layout.js';
import { ACCENTS, normalizeClubRules } from '../rules/club.rules.js';
import { GOAL_METRICS, topClubBadges } from '../utils/club.badges.js';
import { syncClubBadges } from '../utils/club.badge.service.js';
import { clubShirtCheck } from '../utils/shirts.js';

const Club = db.club;
const Player = db.player;

const ADMIN_FIELDS = 'firstname lastname email';

const loadManagedClub = async (req, res) => {
    const { id } = req.params;
    const club = db.mongoose.isValidObjectId(id) ? await Club.findById(id) : null;
    if (!club) {
        res.status(404).json({ message: 'Club not found.' });
        return null;
    }
    if (!canManageClub(req.user, club)) {
        res.status(403).json({ message: 'You have no access to this club.' });
        return null;
    }
    return club;
};

const withAdmins = async (club) => {
    await club.populate('admins', ADMIN_FIELDS);
    return { ...club.toJSON(), admins: club.admins.map(admin => admin.toJSON()) };
};

/**
 * Clubs the logged-in user is an admin or a player of, each with that role.
 * This is the same for a global admin: they look after every club from the
 * administration page, but only clubs they belong to are theirs to play in.
 * Each club carries its admins and number of players. Players see who the
 * admins are, but not their email addresses.
 */
export const findAll = async (req, res) => {
    logger.debug('clubs find all called');
    const playerClubIds = await Player.distinct('clubs', { user: req.user._id });
    const filter = { $or: [{ admins: req.user._id }, { _id: { $in: playerClubIds } }] };
    const clubs = await Club.find(filter).sort({ name: 1 }).populate('admins', ADMIN_FIELDS);

    const counts = await Player.aggregate([
        { $match: { clubs: { $in: clubs.map(c => c._id) }, guest: { $ne: true } } },
        { $unwind: '$clubs' },
        { $group: { _id: '$clubs', count: { $sum: 1 } } },
    ]);
    const countByClub = new Map(counts.map(c => [String(c._id), c.count]));
    // the requests to join waiting for the admins
    const adminClubIds = clubs.filter(club => club.admins.some(admin => admin._id.equals(req.user._id))).map(club => club._id);
    const requests = await db.joinRequest.aggregate([
        { $match: { club: { $in: adminClubIds }, status: 'open' } },
        { $group: { _id: '$club', count: { $sum: 1 } } },
    ]);
    const requestsByClub = new Map(requests.map(r => [String(r._id), r.count]));

    res.json(clubs.map(club => {
        const isAdmin = club.admins.some(admin => admin._id.equals(req.user._id));
        return {
            ...club.toJSON(),
            role: isAdmin ? CLUB_ROLES.ADMIN : CLUB_ROLES.PLAYER,
            admins: club.admins.map(admin => {
                const { email, ...publicFields } = admin.toJSON();
                return isAdmin ? { ...publicFields, email } : publicFields;
            }),
            playerCount: countByClub.get(String(club._id)) ?? 0,
            // the club's best medals for its card, and how many it has
            badges: topClubBadges(club.badges),
            badgeCount: club.badges?.length ?? 0,
            ...(isAdmin && { openJoinRequests: requestsByClub.get(String(club._id)) ?? 0 }),
        };
    }));
};

export const create = async (req, res) => {
    logger.debug('clubs create called');
    if (isGlobalAdmin(req.user)) return res.status(403).json({ message: NO_CLUB_FOR_GLOBAL_ADMINS });
    const club = await Club.create({ name: req.body.name, admins: [req.user._id] });
    logger.info(`Club "${club.name}" created by ${req.user.email}`);
    checkLater(() => noteCreated(req, 'club', { id: club._id, name: club.name, club }));
    res.status(201).json({ ...(await withAdmins(club)), role: CLUB_ROLES.ADMIN, playerCount: 0 });
};

/**
 * The club shirt (club admins): { pattern, color, accent, logo }.
 */
export const updateShirt = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const { shirt, error } = clubShirtCheck(req.body);
    if (error) return res.status(422).json({ message: error });
    club.shirt = shirt;
    await club.save();
    res.json(await withAdmins(club));
};

export const update = async (req, res) => {
    logger.debug('clubs update called');
    const club = await loadManagedClub(req, res);
    if (!club) return;
    club.name = req.body.name;
    if (typeof req.body.description === 'string') club.description = req.body.description;
    if (typeof req.body.country === 'string') club.country = req.body.country.toUpperCase();
    if (req.body.accent !== undefined) club.accent = ACCENTS.includes(req.body.accent) ? req.body.accent : null;
    // Visibility settings are optional, so a plain rename leaves them alone
    for (const setting of ['isPublic', 'publicLiveGames', 'publicResults', 'shameBadges', 'shameWithoutChildren', 'connectable']) {
        if (typeof req.body[setting] === 'boolean') club[setting] = req.body[setting];
    }
    if (['open', 'approval', 'closed'].includes(req.body.joinPolicy)) club.joinPolicy = req.body.joinPolicy;
    if (Number.isInteger(req.body.shameMinAge)) club.shameMinAge = req.body.shameMinAge;
    if (Array.isArray(req.body.dashboardWidgets)) club.dashboardWidgets = req.body.dashboardWidgets;
    // the club's dashboard; an empty list means the default set
    if (Array.isArray(req.body.dashboardLayout)) {
        club.dashboardLayout = normalizeLayout(req.body.dashboardLayout);
        club.dashboardWidgets = undefined;
    }
    await club.save();
    if (typeof req.body.description === 'string') checkLater(() => noteClubTexts(req, club, { description: club.description }));
    res.json(await withAdmins(club));
};

/**
 * The club's goals, as its admins set them: up to three, each a metric (see
 * GOAL_METRICS), a target and maybe an end. A goal that stays the same keeps
 * when it started and whether it was reached; a new or changed one starts now.
 * Answers with the goals and how far each is.
 */
export const updateGoals = async (req, res) => {
    logger.debug('clubs update goals called');
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const unknown = req.body.goals.find(goal => !GOAL_METRICS[goal.metric]);
    if (unknown) return res.status(422).json({ errors: [`A club cannot set a goal on ${unknown.metric}.`] });
    const before = new Map((club.goals ?? []).map(goal => [goal.id, goal]));
    const now = new Date();
    club.goals = req.body.goals.map(goal => {
        const kept = goal.id ? before.get(goal.id) : null;
        const same = kept && kept.metric === goal.metric && kept.target === Number(goal.target);
        return {
            id: kept?.id ?? new db.mongoose.Types.ObjectId().toString(),
            metric: goal.metric,
            target: Number(goal.target),
            from: same ? kept.from : now,
            until: goal.until ? new Date(goal.until) : null,
            reachedAt: same ? kept.reachedAt ?? null : null,
        };
    });
    await club.save();
    const { progress } = await syncClubBadges(club, { notify: false });
    const saved = await Club.findById(club._id, 'goals').lean();
    res.json((saved?.goals ?? []).map(goal => ({
        ...goal,
        title: GOAL_METRICS[goal.metric].title,
        description: GOAL_METRICS[goal.metric].describe(goal.target),
        progress: Math.min(progress[goal.id] ?? 0, goal.target),
    })));
};

/**
 * The club's own rules for its games, as its admins set them (see
 * rules/club.rules.js); whatever does not fit is left out.
 */
export const updateGameRules = async (req, res) => {
    logger.debug('clubs update game rules called');
    const club = await loadManagedClub(req, res);
    if (!club) return;
    club.gameRules = normalizeClubRules(req.body);
    club.markModified('gameRules');
    await club.save();
    checkLater(() => noteClubTexts(req, club, { formatNames: (club.gameRules?.formats ?? []).map(format => format.name) }));
    res.json(await withAdmins(club));
};

export const remove = async (req, res) => {
    logger.debug('clubs delete called');
    const club = await loadManagedClub(req, res);
    if (!club) return;

    // A global admin may remove a whole club at once, e.g. one created as spam
    if (!isGlobalAdmin(req.user) && await Player.exists({ clubs: club._id, guest: { $ne: true } })) {
        return res.status(409).json({ message: 'Remove the players of this club before deleting it.' });
    }

    await deleteClubData(club, { by: req.user.email });
    checkLater(() => checkTakeover(req, club, 'deleted the club'));
    res.json({ message: 'Club deleted.' });
};

/**
 * Replaces the club's logo with the uploaded image.
 */
export const uploadLogo = async (req, res) => {
    logger.debug('clubs upload logo called');
    const club = await loadManagedClub(req, res);
    if (!club) {
        if (req.file) removeClubLogoFile(req.file.filename);
        return;
    }
    if (!req.file) return res.status(422).json({ errors: ['Please choose a .png or .jpg image.'] });

    const previous = club.logo;
    club.logo = req.file.filename;
    await club.save();
    if (previous) removeClubLogoFile(previous);
    res.json(await withAdmins(club));
};

export const removeLogo = async (req, res) => {
    logger.debug('clubs remove logo called');
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const previous = club.logo;
    club.logo = '';
    await club.save();
    if (previous) removeClubLogoFile(previous);
    res.json(await withAdmins(club));
};

/**
 * Makes a user an admin of the club. An existing account is added as it is;
 * for an unknown email a new account is created, either with the
 * given initial password or with a mailed "set your password" link.
 */
export const addAdmin = async (req, res) => {
    logger.debug('clubs add admin called');
    const club = await loadManagedClub(req, res);
    if (!club) return;

    const { user, inviteLink, error } = await findOrCreateAccount(req.body, req.user);
    if (error) return res.status(422).json({ errors: [error] });
    if (isGlobalAdminAccount(user)) return res.status(409).json({ message: `${user.email} is a global admin. ${NO_CLUB_FOR_GLOBAL_ADMINS}` });

    if (club.admins.some(admin => admin.equals(user._id))) {
        return res.status(409).json({ message: 'This user is already an admin of the club.' });
    }

    club.admins.push(user._id);
    club.adminSince = [...(club.adminSince ?? []).filter(entry => !entry.user?.equals(user._id)), { user: user._id, at: new Date() }];
    // a club still looked after by a global admin from before they had to stay
    // out of clubs (e.g. the default club of an upgrade) is handed over
    {
        const globalAdmins = await db.user.find({ _id: { $in: club.admins }, role: ROLES.GLOBAL_ADMIN }, '_id');
        globalAdmins.forEach(admin => club.admins.pull(admin._id));
    }
    await club.save();
    logger.info(`${user.email} is now an admin of club "${club.name}" (added by ${req.user.email})`);

    sendClubWelcomeMail(user, inviteLink, 'admin', { club: club.name, inviter: `${req.user.firstname} ${req.user.lastname}`, language: req.user.language });

    res.status(201).json(await withAdmins(club));
};

export const removeAdmin = async (req, res) => {
    logger.debug('clubs remove admin called');
    const club = await loadManagedClub(req, res);
    if (!club) return;

    const { userId } = req.params;
    if (!club.admins.some(admin => admin.equals(userId))) {
        return res.status(404).json({ message: 'This user is not an admin of the club.' });
    }
    if (club.admins.length === 1) {
        return res.status(409).json({ message: 'A club needs at least one admin.' });
    }

    club.admins.pull(userId);
    club.adminSince = (club.adminSince ?? []).filter(entry => String(entry.user) !== String(userId));
    await club.save();
    if (String(userId) !== String(req.user._id)) checkLater(() => checkTakeover(req, club, 'removed another admin'));
    res.json(await withAdmins(club));
};
