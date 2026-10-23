import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { addToClub } from './player.controller.js';
import { canManageClub, isGlobalAdmin } from '../middleware/auth.middleware.js';
import { topClubBadges } from '../utils/club.badges.js';
import { joinBlock, joinNotices } from '../utils/club.joining.js';

const Club = db.club;
const Player = db.player;
const JoinRequest = db.joinRequest;

const nameOf = (user) => `${user.firstname} ${user.lastname}`;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TAKES_MEMBERS = { joinPolicy: { $in: ['open', 'approval'] } };

// tells who should know; a failure only costs the notifications
const notify = async (event, request, club, actor) => {
    try {
        const notices = joinNotices(event, { request, clubName: club.name, admins: club.admins, actor: { id: String(actor._id), name: nameOf(actor) } });
        if (notices.length) await db.notification.insertMany(notices);
    } catch (err) {
        logger.error(err, 'Failed to send the notifications of a join request');
    }
};

// the clubs the user is in: as an admin or with a player
const memberClubIds = async (user) => {
    const [playerClubs, adminClubs] = await Promise.all([
        Player.distinct('clubs', { user: user._id }),
        Club.distinct('_id', { admins: user._id }),
    ]);
    return new Set([...playerClubs, ...adminClubs].map(String));
};

// the player the user plays as in another club, to take along: the one used last
const ownPlayer = (user) => Player.findOne({ user: user._id, guest: { $ne: true } }).sort({ updatedAt: -1 });

/**
 * Makes the user a member of the club: their player from another club joins it
 * too (with the statistics, badges and flights), or a new player is made with
 * the nickname. Resolves to the player.
 */
const makeMember = async (user, club, nickname) => {
    const existing = await Player.findOne({ clubs: club._id, user: user._id });
    if (existing) return existing;
    const player = await ownPlayer(user);
    if (player) {
        const error = await addToClub(player, club);
        if (!error) return player;
        logger.warn(`Joining club "${club.name}": ${error}`);
    }
    return Player.create({ firstname: user.firstname, lastname: user.lastname, nickname, clubs: [club._id], user: user._id });
};

const clubCard = (club, { members, counts, requests }) => ({
    id: String(club._id),
    name: club.name,
    description: club.description ?? '',
    country: club.country ?? '',
    logo: club.logo ?? '',
    joinPolicy: club.joinPolicy,
    playerCount: counts.get(String(club._id)) ?? 0,
    isMember: members.has(String(club._id)),
    request: requests.get(String(club._id)) ?? null,
    badges: topClubBadges(club.badges),
    badgeCount: club.badges?.length ?? 0,
});

const requestView = (request, club) => ({
    id: String(request._id),
    club: String(request.club),
    clubName: club?.name ?? '',
    clubLogo: club?.logo ?? '',
    name: request.name ?? '',
    nickname: request.nickname,
    message: request.message ?? '',
    status: request.status,
    at: request.createdAt,
    decidedAt: request.decidedAt ?? null,
});

/**
 * The clubs that take members, to join or to ask (?q= searches the names),
 * with whether the user is in it already or asked, and the nickname they
 * would play as: the one of their player in another club, or none yet.
 */
export const directory = async (req, res) => {
    const q = String(req.query.q ?? '').trim().slice(0, 50);
    const filter = { ...TAKES_MEMBERS, ...(q && { name: { $regex: escapeRegex(q), $options: 'i' } }) };
    const clubs = await Club.find(filter, 'name description country logo joinPolicy badges').sort({ name: 1 }).limit(100);
    const ids = clubs.map(club => club._id);
    const [members, countList, requestList, player] = await Promise.all([
        memberClubIds(req.user),
        Player.aggregate([
            { $match: { clubs: { $in: ids }, guest: { $ne: true } } },
            { $unwind: '$clubs' },
            { $group: { _id: '$clubs', count: { $sum: 1 } } },
        ]),
        JoinRequest.find({ user: req.user._id, club: { $in: ids }, status: { $in: ['open', 'declined'] } }).sort({ createdAt: 1 }),
        ownPlayer(req.user),
    ]);
    const counts = new Map(countList.map(entry => [String(entry._id), entry.count]));
    // the latest request per club: open, or declined
    const requests = new Map(requestList.map(request => [String(request.club), { id: String(request._id), status: request.status, at: request.createdAt, decidedAt: request.decidedAt ?? null }]));
    res.json({
        nickname: player?.nickname ?? null,
        clubs: clubs.map(club => clubCard(club, { members, counts, requests })),
    });
};

/**
 * Joins a club ({ nickname, message }): an open club at once, an approval
 * club once an admin accepts. The nickname is only needed without a player
 * in another club.
 */
export const join = async (req, res) => {
    const club = db.mongoose.isValidObjectId(req.params.id) ? await Club.findById(req.params.id) : null;
    if (!club) return res.status(404).json({ message: 'Club not found.' });
    try {
        const [members, open, declined, openRequests, player] = await Promise.all([
            memberClubIds(req.user),
            JoinRequest.exists({ club: club._id, user: req.user._id, status: 'open' }),
            JoinRequest.findOne({ club: club._id, user: req.user._id, status: 'declined' }).sort({ decidedAt: -1 }),
            JoinRequest.countDocuments({ user: req.user._id, status: 'open' }),
            ownPlayer(req.user),
        ]);
        const block = joinBlock({
            policy: club.joinPolicy,
            isMember: members.has(String(club._id)),
            isGlobalAdmin: isGlobalAdmin(req.user),
            hasOpenRequest: Boolean(open),
            declinedAt: declined?.decidedAt ?? null,
            openRequests,
        });
        if (block) return res.status(block.status).json({ message: block.message });

        const nickname = player?.nickname ?? String(req.body.nickname ?? '').trim();
        if (!nickname) return res.status(422).json({ errors: ['Choose the nickname you play as.'] });
        const request = {
            club: club._id,
            user: req.user._id,
            name: nameOf(req.user),
            nickname,
            message: String(req.body.message ?? '').trim(),
        };

        if (club.joinPolicy === 'open') {
            const member = await makeMember(req.user, club, nickname);
            await notify('joined', request, club, req.user);
            logger.info(`${req.user.email} joined the open club "${club.name}" as ${member.nickname}`);
            return res.status(201).json({ status: 'member', club: String(club._id), player: member.toJSON() });
        }

        const created = await JoinRequest.create(request);
        await notify('requested', created, club, req.user);
        logger.info(`${req.user.email} asks to join club "${club.name}"`);
        res.status(201).json({ status: 'pending', request: requestView(created, club) });
    } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ message: 'You asked to join this club already. The admins have not decided yet.' });
        logger.error(err, `Failed to join club ${club._id}`);
        res.status(500).json({ message: 'Joining the club did not work. Please try again.' });
    }
};

/**
 * Takes back the open request to join a club; the notifications asking the admins go along.
 */
export const withdraw = async (req, res) => {
    const request = db.mongoose.isValidObjectId(req.params.id)
        ? await JoinRequest.findOne({ club: req.params.id, user: req.user._id, status: 'open' })
        : null;
    if (!request) return res.status(404).json({ message: 'There is no open request to join this club.' });
    request.status = 'withdrawn';
    request.decidedAt = new Date();
    await request.save();
    await db.notification.deleteMany({ kind: 'joinRequested', club: request.club, by: req.user._id });
    res.json(requestView(request, null));
};

/**
 * The user's open requests, with the clubs.
 */
export const mine = async (req, res) => {
    const requests = await JoinRequest.find({ user: req.user._id, status: 'open' }).sort({ createdAt: -1 });
    const clubs = await Club.find({ _id: { $in: requests.map(request => request.club) } }, 'name logo');
    const byId = new Map(clubs.map(club => [String(club._id), club]));
    res.json(requests.map(request => requestView(request, byId.get(String(request.club)))));
};

// the club, for its admins only, or a response sent
const loadManagedClub = async (req, res) => {
    const club = db.mongoose.isValidObjectId(req.params.id) ? await Club.findById(req.params.id) : null;
    if (!club) {
        res.status(404).json({ message: 'Club not found.' });
        return null;
    }
    if (!canManageClub(req.user, club)) {
        res.status(403).json({ message: 'Only the admins of the club see and decide its requests.' });
        return null;
    }
    return club;
};

/**
 * The open requests to join the club, oldest first, for its admins.
 */
export const requestsOfClub = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const requests = await JoinRequest.find({ club: club._id, status: 'open' }).sort({ createdAt: 1 });
    const users = await db.user.find({ _id: { $in: requests.map(request => request.user) } }, 'email');
    const emailById = new Map(users.map(user => [String(user._id), user.email]));
    res.json(requests.map(request => ({ ...requestView(request, club), email: emailById.get(String(request.user)) ?? null })));
};

/**
 * A club admin decides a request: { accept }. Accepting makes the user a member.
 */
export const decide = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const request = db.mongoose.isValidObjectId(req.params.requestId)
        ? await JoinRequest.findOne({ _id: req.params.requestId, club: club._id })
        : null;
    if (!request) return res.status(404).json({ message: 'The request was not found.' });
    if (request.status !== 'open') return res.status(409).json({ message: 'This request was decided already, or taken back.' });
    try {
        let player = null;
        if (req.body.accept) {
            const user = await db.user.findById(request.user);
            if (!user) {
                request.status = 'withdrawn';
                request.decidedAt = new Date();
                await request.save();
                return res.status(410).json({ message: 'The account that asked is gone.' });
            }
            player = await makeMember(user, club, request.nickname);
        }
        request.status = req.body.accept ? 'accepted' : 'declined';
        request.decidedBy = req.user._id;
        request.decidedByName = nameOf(req.user);
        request.decidedAt = new Date();
        await request.save();
        // the other admins need not decide it any more
        await db.notification.deleteMany({ kind: 'joinRequested', club: club._id, by: request.user });
        await notify(req.body.accept ? 'accepted' : 'declined', request, club, req.user);
        logger.info(`${req.user.email} ${request.status} the request of ${request.name} to join club "${club.name}"`);
        res.json({ ...requestView(request, club), player: player?.toJSON() ?? null });
    } catch (err) {
        logger.error(err, `Failed to decide the join request ${request._id}`);
        res.status(500).json({ message: 'The decision could not be saved.' });
    }
};
