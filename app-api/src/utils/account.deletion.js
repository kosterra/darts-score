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
 * The clubs the user is the only admin of, each with the members who could
 * take it over: the accounts of its players, except global admins and
 * blocked accounts; members: how many other members it has.
 * [{ id, name, members, candidates: [{ id, name }] }]
 */
export const soleAdminClubs = async (user) => {
    const clubs = (await db.club.find({ admins: user._id }, 'name admins').lean()).filter(club => (club.admins ?? []).length <= 1);
    const result = [];
    for (const club of clubs) {
        const players = await db.player.find({ clubs: club._id, user: { $ne: null } }, 'user').lean();
        const ids = [...new Set(players.map(player => String(player.user)).filter(id => id !== String(user._id)))];
        const users = ids.length ? await db.user.find({ _id: { $in: ids }, role: { $ne: ROLES.GLOBAL_ADMIN }, blockedAt: null }, 'firstname lastname').lean() : [];
        result.push({
            id: String(club._id),
            name: club.name,
            // the others who lose the club when it is deleted
            members: await db.player.countDocuments({ clubs: club._id, guest: { $ne: true }, user: { $ne: user._id } }),
            candidates: users.map(entry => ({ id: String(entry._id), name: `${entry.firstname} ${entry.lastname}`.trim() }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        });
    }
    return result;
};

/**
 * Why the steps for the clubs of the only admin do not do, or null. Every
 * such club is handed over to one of its candidates ({ club, action:
 * 'handover', to }) or deleted, confirmed with its name ({ club, action:
 * 'delete', name }).
 */
export const stepsError = (clubs, steps = []) => {
    for (const club of clubs) {
        const step = (Array.isArray(steps) ? steps : []).find(entry => String(entry?.club) === club.id);
        if (!step) return `Hand ${club.name} over or delete it first.`;
        if (step.action === 'handover') {
            if (!club.candidates.some(candidate => candidate.id === String(step.to))) return `Choose who takes ${club.name} over.`;
        } else if (step.action === 'delete') {
            if (String(step.name ?? '').trim().toLowerCase() !== club.name.trim().toLowerCase()) return `Type the name ${club.name} to delete the club.`;
        } else return `Hand ${club.name} over or delete it first.`;
    }
    return null;
};

// why the only global admin cannot go, or null: the installation keeps one
export const lastGlobalAdmin = async (user) => (
    user.role === ROLES.GLOBAL_ADMIN && (await db.user.countDocuments({ role: ROLES.GLOBAL_ADMIN })) <= 1
        ? 'You are the only global admin. Make another account a global admin first.'
        : null
);

/**
 * Why the account cannot be deleted now, or null: the installation keeps a
 * global admin; the only admin of a club hands it over or deletes it, with
 * the steps given (see stepsError).
 */
export const deletionBlock = async (user, steps = []) => {
    const lastOne = await lastGlobalAdmin(user);
    if (lastOne) return { message: lastOne };
    const clubs = await soleAdminClubs(user);
    const message = stepsError(clubs, steps);
    return message ? { message, clubs: clubs.map(club => club.name) } : null;
};

/**
 * Carries out the steps for the clubs of the only admin before the account
 * goes: the new admin first (and told so), so no club is left without one;
 * or the club deleted with everything in it. Checked with stepsError before.
 */
export const carryOutSteps = async (user, steps = []) => {
    const clubs = await soleAdminClubs(user);
    const { deleteClubData } = await import('./club.deletion.js');
    const { deliverQuietly } = await import('./notify.js');
    for (const club of clubs) {
        const step = steps.find(entry => String(entry?.club) === club.id);
        if (step.action === 'handover') {
            await db.club.updateOne({ _id: club.id }, { $addToSet: { admins: step.to }, $push: { adminSince: { user: step.to, at: new Date() } } });
            await deliverQuietly([{
                user: step.to, kind: 'clubHandedOver', club: club.id, link: '/club',
                title: `You are now the admin of ${club.name}`,
                body: 'Its admin deleted their account and handed the club over to you: its players, members and settings are yours to look after now.',
            }]);
            logger.info(`Club "${club.name}" handed over to ${step.to} before deleting the account ${user._id}`);
        } else {
            await deleteClubData(await db.club.findById(club.id), { by: `its only admin ${user._id}, deleting their account` });
        }
    }
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
        // an update made of stages: Mongoose only runs it when asked to
        { updatePipeline: true },
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
        db.session.deleteMany({ user: userId }),
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
