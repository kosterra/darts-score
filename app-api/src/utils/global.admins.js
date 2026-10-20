import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';

// Global admins look after the whole app and stay out of the clubs: they run
// none, play in none and are no club's admin, so they never see a club from
// the inside and its admins never depend on them.
export const NO_CLUB_FOR_GLOBAL_ADMINS = 'Global admins look after the app and do not belong to a club. Use another account to run a club or to play.';

export const isGlobalAdminAccount = (user) => user?.role === ROLES.GLOBAL_ADMIN;

/**
 * The clubs an account belongs to: { admin: names, player: names }, to tell
 * why it cannot become a global admin.
 */
export const clubsOfAccount = async (userId) => {
    const [adminOf, players] = await Promise.all([
        db.club.find({ admins: userId }, 'name').lean(),
        db.player.find({ user: userId }, 'clubs').lean(),
    ]);
    const playerClubIds = [...new Set(players.flatMap(player => (player.clubs ?? []).map(String)))];
    const playerOf = playerClubIds.length ? await db.club.find({ _id: { $in: playerClubIds } }, 'name').lean() : [];
    return { admin: adminOf.map(club => club.name), player: playerOf.map(club => club.name) };
};
