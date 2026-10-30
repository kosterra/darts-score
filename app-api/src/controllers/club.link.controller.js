import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { canManageClub } from '../middleware/auth.middleware.js';
import { deliver } from '../utils/notify.js';
import { otherClub, pairKey } from '../utils/club.links.js';

/**
 * Connections between clubs: an admin of one club asks, an admin of the other
 * accepts. Once accepted, either club can invite the other into a shared
 * tournament (see utils/tournaments.js). A connection grants no other access
 * to the club's players, games or statistics.
 */

const Club = db.club;
const ClubLink = db.clubLink;

const nameOf = (user) => `${user.firstname} ${user.lastname}`;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the club of the request, for its admins only, or a response sent
const loadManagedClub = async (req, res) => {
    const club = db.mongoose.isValidObjectId(req.params.id) ? await Club.findById(req.params.id) : null;
    if (!club) {
        res.status(404).json({ message: 'Club not found.' });
        return null;
    }
    if (!canManageClub(req.user, club)) {
        res.status(403).json({ message: 'Only the admins of the club manage its connections.' });
        return null;
    }
    return club;
};

// tells the admins of a club about a connection; a failure only costs the notice
const notifyAdmins = async (clubId, notice) => {
    try {
        const club = await Club.findById(clubId, 'admins name').lean();
        const admins = club?.admins ?? [];
        if (admins.length) await deliver(admins.map(user => ({ user, club: clubId, link: '/club#connections', ...notice })));
    } catch (err) {
        logger.error(err, 'Failed to tell a club about a connection');
    }
};

// a connection as the app shows it, from the point of view of the given club
const linkView = (link, clubId, byName) => {
    const otherId = otherClub(link, clubId);
    return {
        id: String(link._id),
        club: otherId,
        clubName: byName.get(otherId) ?? '',
        status: link.status,
        // the side of the connection: who still has to decide
        incoming: link.status === 'pending' && String(link.requestedClub) !== String(clubId),
        outgoing: link.status === 'pending' && String(link.requestedClub) === String(clubId),
        requestedByName: link.requestedByName ?? '',
        since: link.since ?? null,
        at: link.createdAt,
    };
};

/**
 * The club's connections, for its admins: the accepted ones and the pending
 * requests, each with the other club.
 */
export const list = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const links = await ClubLink.find({ clubs: club._id }).sort({ createdAt: -1 });
    const otherIds = links.map(link => otherClub(link, club._id)).filter(Boolean);
    const clubs = await Club.find({ _id: { $in: otherIds } }, 'name logo country').lean();
    const byName = new Map(clubs.map(other => [String(other._id), other.name]));
    const byLogo = new Map(clubs.map(other => [String(other._id), { logo: other.logo ?? '', country: other.country ?? '' }]));
    res.json(links.map(link => ({ ...linkView(link, club._id, byName), ...(byLogo.get(otherClub(link, club._id)) ?? {}) })));
};

/**
 * Clubs the club can connect to (?q= searches the names): every other club,
 * without the ones already connected or asked.
 */
export const connectable = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const q = String(req.query.q ?? '').trim().slice(0, 50);
    const links = await ClubLink.find({ clubs: club._id }, 'clubs').lean();
    const taken = new Set(links.map(link => otherClub(link, club._id)));
    // clubs that turned off being findable are left out of the search
    const filter = { _id: { $ne: club._id }, connectable: { $ne: false }, ...(q && { name: { $regex: escapeRegex(q), $options: 'i' } }) };
    const clubs = await Club.find(filter, 'name logo country').sort({ name: 1 }).limit(100).lean();
    res.json(clubs
        .filter(other => !taken.has(String(other._id)))
        .map(other => ({ id: String(other._id), name: other.name, logo: other.logo ?? '', country: other.country ?? '' })));
};

/**
 * Asks another club for a connection ({ clubId }). The other club's admins
 * decide.
 */
export const request = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const otherId = req.body.clubId;
    if (!db.mongoose.isValidObjectId(otherId) || String(otherId) === String(club._id)) {
        return res.status(422).json({ message: 'Choose another club to connect to.' });
    }
    const other = await Club.findById(otherId, 'name');
    if (!other) return res.status(404).json({ message: 'That club was not found.' });
    try {
        const link = await ClubLink.create({
            clubs: [club._id, other._id].sort(),
            pair: pairKey(club._id, other._id),
            requestedClub: club._id,
            requestedBy: req.user._id,
            requestedByName: nameOf(req.user),
            status: 'pending',
        });
        await notifyAdmins(other._id, {
            kind: 'clubConnectionRequested',
            title: `${club.name} wants to connect with ${other.name}`,
            body: 'Accept to play shared tournaments together. Decide on your club page.',
            by: req.user._id, byName: nameOf(req.user),
        });
        logger.info(`${req.user.email} asks to connect club "${club.name}" with "${other.name}"`);
        res.status(201).json({ ...linkView(link, club._id, new Map([[String(other._id), other.name]])), logo: other.logo ?? '' });
    } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ message: 'These clubs are already connected, or a request is pending.' });
        logger.error(err, `Failed to connect clubs ${club._id} and ${otherId}`);
        res.status(500).json({ message: 'The connection could not be requested. Please try again.' });
    }
};

/**
 * A club admin decides a pending request addressed to their club ({ accept }).
 * Accepting makes the connection; declining removes it.
 */
export const decide = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const link = db.mongoose.isValidObjectId(req.params.linkId)
        ? await ClubLink.findOne({ _id: req.params.linkId, clubs: club._id })
        : null;
    if (!link) return res.status(404).json({ message: 'That connection request was not found.' });
    if (link.status !== 'pending') return res.status(409).json({ message: 'This connection was decided already.' });
    // only the club that was asked may decide
    if (String(link.requestedClub) === String(club._id)) {
        return res.status(403).json({ message: 'The other club decides your request.' });
    }
    const other = await Club.findById(link.requestedClub, 'name');
    try {
        if (req.body.accept) {
            link.status = 'accepted';
            link.since = new Date();
            link.decidedBy = req.user._id;
            link.decidedByName = nameOf(req.user);
            await link.save();
            await notifyAdmins(link.requestedClub, {
                kind: 'clubConnectionAccepted',
                title: `${club.name} accepted your connection`,
                body: `You can now invite ${club.name} into your tournaments, and they yours.`,
                by: req.user._id, byName: nameOf(req.user),
            });
            logger.info(`${req.user.email} connected "${club.name}" with "${other?.name ?? link.requestedClub}"`);
            return res.json({ ...linkView(link, club._id, new Map([[String(link.requestedClub), other?.name ?? '']])), logo: other?.logo ?? '' });
        }
        await ClubLink.deleteOne({ _id: link._id });
        logger.info(`${req.user.email} declined the connection of "${other?.name ?? link.requestedClub}" with "${club.name}"`);
        res.json({ id: String(link._id), status: 'declined' });
    } catch (err) {
        logger.error(err, `Failed to decide the connection ${link._id}`);
        res.status(500).json({ message: 'The decision could not be saved.' });
    }
};

/**
 * Removes a connection: an accepted one is disconnected, a request the club
 * sent is withdrawn. Either admin of the two clubs can do it.
 */
export const remove = async (req, res) => {
    const club = await loadManagedClub(req, res);
    if (!club) return;
    const link = db.mongoose.isValidObjectId(req.params.linkId)
        ? await ClubLink.findOne({ _id: req.params.linkId, clubs: club._id })
        : null;
    if (!link) return res.status(404).json({ message: 'That connection was not found.' });
    await ClubLink.deleteOne({ _id: link._id });
    const otherId = otherClub(link, club._id);
    if (link.status === 'accepted' && otherId) {
        await notifyAdmins(otherId, {
            kind: 'clubConnectionAccepted',
            title: `${club.name} ended the connection`,
            body: 'You can no longer invite each other into tournaments.',
            by: req.user._id, byName: nameOf(req.user),
        });
    }
    logger.info(`${req.user.email} removed the connection ${link._id} of club "${club.name}"`);
    res.json({ id: String(link._id), status: 'removed' });
};
