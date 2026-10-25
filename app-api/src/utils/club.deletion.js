import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { removeClubLogoFile } from '../controllers/file.controller.js';
import { removeProfileImageIfUnused } from './player.images.js';

/**
 * Deletes a club with everything that belongs to it: its games, trainings,
 * tournaments, requests and what the app worked out for it. Players of this
 * club only go with it; members of other clubs stay there.
 */
export const deleteClubData = async (club, { by = '' } = {}) => {
    const onlyHere = { clubs: [club._id] };
    const players = await db.player.find(onlyHere, 'profileImg');
    await db.playerContact.deleteMany({ player: { $in: players.map(player => player._id) } });
    // one after the other, so no player loses their last club without being deleted
    await db.player.deleteMany(onlyHere);
    await Promise.all([
        db.player.updateMany({ $or: [{ clubs: club._id }, { formerClubs: club._id }] }, { $pull: { clubs: club._id, formerClubs: club._id } }),
        db.x01.deleteMany({ club: club._id }),
        db.cricket.deleteMany({ club: club._id }),
        db.elimination.deleteMany({ club: club._id }),
        db.clock.deleteMany({ club: club._id }),
        db.rulesGame.deleteMany({ club: club._id }),
        db.rulesTraining.deleteMany({ club: club._id }),
        db.atc.deleteMany({ club: club._id }),
        db.x01Training.deleteMany({ club: club._id }),
        db.joinRequest.deleteMany({ club: club._id }),
        db.playerClaim.deleteMany({ club: club._id }),
        db.tournament.deleteMany({ club: club._id }),
        db.clubTally.deleteMany({ club: club._id }),
        db.fairPlayHit.deleteMany({ club: club._id }),
        db.deletionRequest.deleteMany({ club: club._id }),
        db.user.updateMany({ defaultClub: club._id }, { $set: { defaultClub: null } }),
    ]);
    await db.club.deleteOne({ _id: club._id });
    removeClubLogoFile(club.logo);
    for (const player of players) await removeProfileImageIfUnused(player.profileImg);
    logger.info(`Club "${club.name}" deleted${by ? ` by ${by}` : ''}`);
};
