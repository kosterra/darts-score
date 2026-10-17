import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';

const User = db.user;
const Club = db.club;

/**
 * Every account, with the clubs it belongs to and its role in each.
 */
export const findAll = async (req, res) => {
    logger.debug('users find all called');
    const [users, clubs, players] = await Promise.all([
        User.find({}).sort({ lastname: 1, firstname: 1 }),
        Club.find({}, 'name admins').lean(),
        db.player.find({ user: { $ne: null } }, 'user clubs').lean(),
    ]);
    const clubNames = new Map(clubs.map(club => [String(club._id), club.name]));

    const membershipsOf = (userId) => {
        const id = String(userId);
        const memberships = clubs
            .filter(club => club.admins.some(admin => String(admin) === id))
            .map(club => ({ id: club._id, name: club.name, role: CLUB_ROLES.ADMIN }));
        players
            .filter(player => String(player.user) === id)
            .flatMap(player => player.clubs ?? [])
            .filter(clubId => clubNames.has(String(clubId)) && !memberships.some(m => String(m.id) === String(clubId)))
            .forEach(clubId => memberships.push({ id: clubId, name: clubNames.get(String(clubId)), role: CLUB_ROLES.PLAYER }));
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
    logger.info(`User ${user.email} deleted by ${req.user.email}`);
    res.json({ message: 'User deleted.' });
};
