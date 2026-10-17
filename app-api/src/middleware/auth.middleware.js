import db from '../models/db.model.js';
import { ROLES, CLUB_ROLES } from '../models/user.model.js';
import { readSession } from '../utils/auth.utils.js';

const User = db.user;
const Club = db.club;
const Player = db.player;

export const isGlobalAdmin = (user) => user?.role === ROLES.GLOBAL_ADMIN;

export const canManageClub = (user, club) =>
    isGlobalAdmin(user) || club.admins.some(admin => admin.equals(user._id));

/**
 * The role a user has in a club: admin (one of its admins, or a global admin),
 * player (linked to one of its players) or null when they have no access.
 */
export const getClubRole = async (user, club) => {
    if (canManageClub(user, club)) return CLUB_ROLES.ADMIN;
    if (await Player.exists({ clubs: club._id, user: user._id })) return CLUB_ROLES.PLAYER;
    return null;
};

/**
 * Requires a logged-in user and exposes it as req.user.
 */
export const requireAuth = async (req, res, next) => {
    const session = readSession(req);
    if (!session || !db.mongoose.isValidObjectId(session.uid)) {
        return res.status(401).json({ message: 'Please log in.' });
    }
    const user = await User.findById(session.uid);
    if (!user || user.sessionVersion !== session.v) {
        return res.status(401).json({ message: 'Please log in.' });
    }
    if (user.blockedAt) {
        return res.status(403).json({ message: 'This account is blocked. Please contact the administrator of this installation.', blocked: true });
    }
    req.user = user;
    next();
};

export const requireGlobalAdmin = (req, res, next) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Global admin rights required.' });
    next();
};

/**
 * Resolves the club a request works on from the X-Club-Id header, checks the
 * user is an admin or a player of it and exposes it as req.club, with their
 * role as req.clubRole. Players, games, training entries and statistics are
 * always read and written within that club.
 */
export const requireClub = async (req, res, next) => {
    const clubId = req.get('x-club-id');
    if (!clubId || !db.mongoose.isValidObjectId(clubId)) {
        return res.status(400).json({ message: 'No club selected.' });
    }
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club not found.' });

    const role = await getClubRole(req.user, club);
    if (!role) return res.status(403).json({ message: 'You have no access to this club.' });

    req.club = club;
    req.clubRole = role;
    next();
};

/**
 * For what only club admins may do: managing players and deleting records.
 * Runs after requireClub.
 */
export const requireClubAdmin = (req, res, next) => {
    if (req.clubRole !== CLUB_ROLES.ADMIN) {
        return res.status(403).json({ message: 'Only club admins can do this.' });
    }
    next();
};
