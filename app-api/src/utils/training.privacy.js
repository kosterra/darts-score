import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { isGlobalAdmin } from '../middleware/auth.middleware.js';

// Players decide whether the others in the club see their trainings (a
// setting of the player). Their own trainings they always see, and so do the
// club's admins and the global admins, who look after the club and fair play.

const seesAll = (req) => isGlobalAdmin(req.user) || req.clubRole === CLUB_ROLES.ADMIN;

/**
 * The players of the club whose trainings the user does not see: ids as strings.
 */
export const hiddenTrainingPlayers = async (req) => {
    if (seesAll(req)) return [];
    const players = await db.player.find({ clubs: req.club._id, privateTrainings: true, user: { $ne: req.user._id } }, '_id').lean();
    return players.map(player => String(player._id));
};

// whether the user sees the trainings of this player
export const seesTrainingsOf = async (req, playerId) => !(await hiddenTrainingPlayers(req)).includes(String(playerId));

// whether the user may delete a training of this player: their own, or as an admin
export const mayDeleteTrainingOf = async (req, playerId) => {
    if (seesAll(req)) return true;
    if (!db.mongoose.isValidObjectId(playerId)) return false;
    return Boolean(await db.player.exists({ _id: playerId, user: req.user._id }));
};
