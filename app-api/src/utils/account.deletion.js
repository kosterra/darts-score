import { randomBytes } from 'node:crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { removeProfileImageIfUnused } from './player.images.js';

/**
 * Deleting an account: the account goes, with its settings, notifications
 * and login; its players stay, anonymised, so the games, statistics and
 * records of the others stay whole. Every copy of their names elsewhere
 * (trainings, club badges and goals, requests, reviews, the texts of
 * notifications) is replaced by the anonymous one.
 */

// the name the anonymised player plays under from now on, the same in every language
const ANON = 'Anon';
export const FORMER_MEMBER = 'Former member';
export const anonymousNickname = () => `${ANON} ${randomBytes(2).toString('hex').toUpperCase()}`;

/**
 * Why the account cannot be deleted now, or null: the only admin of a club
 * hands it over or deletes it first; the installation keeps a global admin.
 */
export const deletionBlock = async (user) => {
    if (user.role === ROLES.GLOBAL_ADMIN && (await db.user.countDocuments({ role: ROLES.GLOBAL_ADMIN })) <= 1) {
        return { message: 'You are the only global admin. Make another account a global admin first.' };
    }
    const clubs = await db.club.find({ admins: user._id }, 'name admins').lean();
    const alone = clubs.filter(club => (club.admins ?? []).length <= 1).map(club => club.name);
    if (alone.length) return { message: `You are the only admin of ${alone.join(', ')}. Add another admin or delete the club first.`, clubs: alone };
    return null;
};

// replaces a name in the titles and texts of the notifications of some clubs
// (other people's notifications mention it too); only there, so somebody else
// with the same name in another club keeps theirs
const replaceInNotifications = async (from, to, clubIds) => {
    if (!from || from.length < 3 || !clubIds.length) return;
    const pattern = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replaced = (field) => ({ $replaceAll: { input: { $ifNull: [`$${field}`, ''] }, find: from, replacement: to } });
    await db.notification.updateMany(
        { club: { $in: clubIds }, $or: [{ title: { $regex: pattern } }, { body: { $regex: pattern } }] },
        [{ $set: { title: replaced('title'), body: replaced('body') } }],
    );
};

/**
 * Anonymises one player of the account: a new nickname, no name, picture,
 * date of birth or country, a guest from now on (not listed as a member, not
 * offered when picking players); the copies of its names follow.
 */
const anonymisePlayer = async (player) => {
    const nickname = anonymousNickname();
    const before = { nickname: player.nickname, name: `${player.firstname} ${player.lastname}`.trim(), img: player.profileImg };
    const id = String(player._id);
    await db.player.updateOne({ _id: player._id }, {
        $set: {
            nickname, firstname: ANON, lastname: nickname.slice(ANON.length + 1),
            profileImg: '', dateOfBirth: null, country: '', user: null, guest: true, publicProfile: false,
            birthChanges: [], anonymizedAt: new Date(),
        },
    });
    await Promise.all([
        db.atc.updateMany({ 'player.id': id }, { $set: { 'player.nickname': nickname } }),
        db.rulesTraining.updateMany({ 'player.id': id }, { $set: { 'player.nickname': nickname } }),
        db.club.updateMany({ 'badges.player': id }, { $set: { 'badges.$[entry].nickname': nickname } }, { arrayFilters: [{ 'entry.player': id }] }),
        db.club.updateMany({ 'goals.reachedBy': id }, { $set: { 'goals.$[goal].nickname': nickname } }, { arrayFilters: [{ 'goal.reachedBy': id }] }),
        db.deletionRequest.updateMany({ 'players.player': id }, { $set: { 'players.$[entry].nickname': nickname } }, { arrayFilters: [{ 'entry.player': id }] }),
        db.playerContact.deleteMany({ player: player._id }),
        db.playerClaim.deleteMany({ player: player._id }),
    ]);
    // the full name first, so a nickname inside it is not replaced on its own
    const clubs = [...(player.clubs ?? []), ...(player.formerClubs ?? [])];
    await replaceInNotifications(before.name, nickname, clubs);
    await replaceInNotifications(before.nickname, nickname, clubs);
    await removeProfileImageIfUnused(before.img);
    return nickname;
};

/**
 * Deletes the account and anonymises what stays of it. Resolves to the
 * nicknames its players play under from now on.
 */
export const deleteAccount = async (user, { by = null } = {}) => {
    const userId = user._id;
    const fullName = `${user.firstname} ${user.lastname}`.trim();
    const players = await db.player.find({ user: userId });
    // the clubs where the account's name may show: those of its players and those it ran
    const clubIds = [
        ...players.flatMap(player => [...(player.clubs ?? []), ...(player.formerClubs ?? [])]),
        ...(await db.club.find({ admins: userId }, '_id').lean()).map(club => club._id),
    ];
    const nicknames = [];
    for (const player of players) nicknames.push(await anonymisePlayer(player));

    await Promise.all([
        db.club.updateMany({ admins: userId }, { $pull: { admins: userId, adminSince: { user: userId } } }),
        db.notification.deleteMany({ user: userId }),
        // what it asked: closed, without its name
        db.joinRequest.deleteMany({ user: userId }),
        db.deletionRequest.updateMany({ by: userId }, { $set: { byName: FORMER_MEMBER } }),
        db.deletionRequest.updateMany({ decidedBy: userId }, { $set: { decidedByName: FORMER_MEMBER } }),
        db.deletionRequest.updateMany({ 'players.user': userId }, { $set: { 'players.$[entry].user': null } }, { arrayFilters: [{ 'entry.user': userId }] }),
        db.joinRequest.updateMany({ decidedBy: userId }, { $set: { decidedByName: FORMER_MEMBER } }),
        db.integrityReview.updateMany({ by: userId }, { $set: { byName: FORMER_MEMBER } }),
        db.notification.updateMany({ by: userId }, { $set: { byName: FORMER_MEMBER } }),
        // the alerts stay for the global admins, without the address
        db.alert.updateMany({ user: userId }, { $set: { userEmail: '' } }),
    ]);
    await replaceInNotifications(fullName, FORMER_MEMBER, clubIds);
    await db.user.deleteOne({ _id: userId });
    logger.info(`Account ${userId} deleted${by ? ` by ${by}` : ' by its owner'}; ${nicknames.length} players anonymised`);
    return nicknames;
};
