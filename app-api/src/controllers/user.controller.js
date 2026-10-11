import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

const User = db.user;
const Club = db.club;

export const findAll = async (req, res) => {
    logger.debug('users find all called');
    const users = await User.find({}).sort({ lastname: 1, firstname: 1 });

    const counts = await Club.aggregate([{ $unwind: '$admins' }, { $group: { _id: '$admins', count: { $sum: 1 } } }]);
    const countByUser = new Map(counts.map(c => [String(c._id), c.count]));

    res.json(users.map(user => ({
        ...user.toJSON(),
        clubCount: countByUser.get(String(user._id)) ?? 0,
    })));
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
