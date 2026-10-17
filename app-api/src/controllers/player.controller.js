import logger from '../models/logger.model.js';
import { noteCreated, checkLater } from '../utils/spam.guard.js';
import db from '../models/db.model.js';
import { removeProfileImageFile } from './file.controller.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { inClub, knownInClub } from '../models/player.model.js';
import { findOrCreateAccount, sendClubWelcomeMail } from '../utils/accounts.js';
import { canManageClub } from '../middleware/auth.middleware.js';

const Player = db.player;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every lookup is limited to the club the request works on: changes to its
// members, reading also to former members, whose games the club still shows
const findInClub = (req, filter = inClub) =>
    db.mongoose.isValidObjectId(req.params.id)
        ? Player.findOne({ _id: req.params.id, ...filter(req.club._id) })
        : null;

/**
 * Players as sent to the client. Club admins also get the email of the
 * account a player logs in with.
 */
const toClient = async (players, req) => {
    const list = players.map(p => p.toJSON());
    if (req.clubRole !== CLUB_ROLES.ADMIN) return list;

    const accounts = await db.user.find({ _id: { $in: list.map(p => p.user).filter(Boolean) } }, 'email');
    const emailById = new Map(accounts.map(account => [String(account._id), account.email]));
    return list.map(p => p.user ? { ...p, accountEmail: emailById.get(String(p.user)) ?? null } : p);
};

export const create = async (req, res) => {
    logger.debug('players create called');
    const player = await Player.create({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        nickname: req.body.nickname,
        dateOfBirth: req.body.dateOfBirth,
        profileImg: req.file ? req.file.filename : '',
        clubs: [req.club._id],
    });
    checkLater(() => noteCreated(req, 'player', { id: player._id, name: player.nickname, names: [player.nickname, player.firstname, player.lastname] }));
    res.send(player.toJSON());
};

/**
 * Adds a guest for a game. Every member of the club may do this; the guest
 * does not become a club member.
 */
export const createGuest = async (req, res) => {
    logger.debug('players create guest called');
    const guest = await Player.create({
        firstname: req.body.name,
        lastname: 'Guest',
        nickname: req.body.name,
        guest: true,
        clubs: [req.club._id],
    });
    checkLater(() => noteCreated(req, 'player', { id: guest._id, name: guest.nickname }));
    res.status(201).send(guest.toJSON());
};

/**
 * Turns a guest into a regular player of the club.
 */
export const makeMember = async (req, res) => {
    logger.debug('players make member called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    player.guest = false;
    await player.save();
    res.send(player.toJSON());
};

/**
 * Adds the logged-in user as a player of the club, so a club admin can play too.
 */
export const createForCurrentUser = async (req, res) => {
    logger.debug('players create for current user called');
    if (await Player.exists({ clubs: req.club._id, user: req.user._id })) {
        return res.status(409).json({ message: 'You are already a player of this club.' });
    }
    const player = await Player.create({
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        nickname: req.body.nickname,
        clubs: [req.club._id],
        user: req.user._id,
    });
    res.status(201).send(player.toJSON());
};

// Guests are left out unless a list asks for them (game history needs their names)
const memberFilter = (req) => ({
    clubs: req.club._id,
    ...(req.query.includeGuests !== 'true' && { guest: { $ne: true } }),
});

export const findAll = async (req, res) => {
    logger.debug('players find all called!');
    const players = await Player.find(memberFilter(req));
    res.send(await toClient(players, req));
};

export const findBySearchTerm = async (req, res) => {
    logger.debug('players find by search term called!');
    const condition = memberFilter(req);
    // The UI sends "search"; "searchTerm" is kept for older clients
    const searchTerm = req.query.search ?? req.query.searchTerm;
    if (searchTerm) {
        const regex = new RegExp(escapeRegex(String(searchTerm)), 'i');
        condition.$or = [{ firstname: regex }, { lastname: regex }, { nickname: regex }];
    }
    const players = await Player.find(condition);
    res.send(await toClient(players, req));
};

const RECENT_GAMES = 100;

/**
 * When each player last played in the club, { [playerId]: date }, from the
 * latest games of every type: the game setup offers recent players first.
 */
export const lastPlayed = async (req, res) => {
    logger.debug('players last played called!');
    const latest = await Promise.all([db.x01, db.cricket, db.elimination].map(model =>
        model.find({ club: req.club._id }, 'players createdAt').sort({ createdAt: -1 }).limit(RECENT_GAMES).lean()
    ));
    const lastPlayedById = {};
    for (const game of latest.flat()) {
        for (const playerId of game.players ?? []) {
            if (!lastPlayedById[playerId] || game.createdAt > lastPlayedById[playerId]) lastPlayedById[playerId] = game.createdAt;
        }
    }
    res.send(lastPlayedById);
};

export const findByIds = async (req, res) => {
    logger.debug('players find by ids called!');
    const ids = req.body.playerIds.filter(id => db.mongoose.isValidObjectId(id));
    const players = await Player.find({ _id: { $in: ids }, ...knownInClub(req.club._id) });
    res.send(players.map(p => p.toJSON()));
};

export const findOne = async (req, res) => {
    logger.debug('players find one called!');
    const player = await findInClub(req, knownInClub);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    res.send(player.toJSON());
};

export const update = async (req, res) => {
    logger.debug('players update called!');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });

    // Players may edit their own entry, everything else is for club admins
    const isOwnPlayer = player.user && player.user.equals(req.user._id);
    if (req.clubRole !== CLUB_ROLES.ADMIN && !isOwnPlayer) {
        if (req.file) removeProfileImageFile(req.file.filename);
        return res.status(403).send({ message: 'Only club admins can edit other players.' });
    }

    const previousImg = player.profileImg;
    player.firstname = req.body.firstname;
    player.lastname = req.body.lastname;
    player.nickname = req.body.nickname;
    player.dateOfBirth = req.body.dateOfBirth;
    if (req.file) player.profileImg = req.file.filename;
    else if (req.body.clearProfileImg === 'true') player.profileImg = '';
    await player.save();

    // Only drop the old file once it has really been replaced or cleared
    if (previousImg && previousImg !== player.profileImg) removeProfileImageFile(previousImg);
    res.send({ message: 'Player was updated successfully.' });
};

export const remove = async (req, res) => {
    logger.debug('players delete called!');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });

    // a member of other clubs only leaves this one; their games here keep their name
    if (player.clubs.length > 1) {
        await removeFromClub(player, req.club._id);
        logger.info(`Player "${player.nickname}" removed from club "${req.club.name}" by ${req.user.email}`);
        return res.send({ message: 'Player was removed from this club.', removed: 'membership' });
    }

    await player.deleteOne();
    removeProfileImageFile(player.profileImg);
    res.send({ message: 'Player was deleted successfully!', removed: 'player' });
};

/**
 * Ends a player's membership in a club; the club remembers them as a former member.
 */
export const removeFromClub = async (player, clubId) => {
    player.clubs = player.clubs.filter(id => !id.equals(clubId));
    if (!player.formerClubs.some(id => id.equals(clubId))) player.formerClubs.push(clubId);
    await player.save();
};

/**
 * Makes a player a member of another club too. Resolves to an error message
 * when that is not possible.
 */
export const addToClub = async (player, club) => {
    if (player.guest) return 'A guest cannot be added to another club. Make them a club member first.';
    if (player.clubs.some(id => id.equals(club._id))) return `${player.nickname} is already a member of ${club.name}.`;
    // the account behind the player can only be one player per club
    if (player.user && await Player.exists({ clubs: club._id, user: player.user })) {
        return `The account of ${player.nickname} already plays in ${club.name} as another player.`;
    }
    player.clubs.push(club._id);
    player.formerClubs = player.formerClubs.filter(id => !id.equals(club._id));
    await player.save();
    return null;
};

/**
 * Gives a player a login: links them to the account with this email, creating
 * that account when needed. The user then has the player role in the club.
 */
export const giveLogin = async (req, res) => {
    logger.debug('players give login called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });

    if (player.guest) {
        return res.status(409).json({ message: 'Make this guest a club member before giving them a login.' });
    }

    const { user, inviteLink, error } = await findOrCreateAccount({
        email: req.body.email,
        password: req.body.password,
        firstname: player.firstname,
        lastname: player.lastname,
    }, req.user);
    if (error) return res.status(422).json({ errors: [error] });

    // one account is one player per club, also in the player's other clubs
    const other = await Player.findOne({ clubs: { $in: player.clubs }, user: user._id, _id: { $ne: player._id } });
    if (other) {
        return res.status(409).json({ message: `This account already plays as ${other.nickname} in a club of this player.` });
    }

    player.user = user._id;
    await player.save();
    logger.info(`${user.email} can now log in as player "${player.nickname}" of club "${req.club.name}"`);

    sendClubWelcomeMail(
        user,
        inviteLink,
        `You can now play at ${req.club.name}`,
        `${req.user.firstname} ${req.user.lastname} gave you a login as player "${player.nickname}" of the club "${req.club.name}" on Oche. You can start games and trainings there on your own.`
    );

    res.send((await toClient([player], req))[0]);
};

export const removeLogin = async (req, res) => {
    logger.debug('players remove login called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });

    // The account itself stays: it may belong to other clubs as well
    player.user = null;
    await player.save();
    res.send(player.toJSON());
};

/**
 * Decides whether a player's nickname may appear on the public start page.
 * Club admins decide for everyone, players with a login for themselves.
 */
export const setVisibility = async (req, res) => {
    logger.debug('players set visibility called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });

    const isOwnPlayer = player.user && player.user.equals(req.user._id);
    if (req.clubRole !== CLUB_ROLES.ADMIN && !isOwnPlayer) {
        return res.status(403).send({ message: 'Only club admins can change this for other players.' });
    }

    player.publicProfile = req.body.publicProfile;
    await player.save();
    res.send((await toClient([player], req))[0]);
};

/**
 * The clubs a player of the selected club is a member of, each saying whether
 * the user may change it (they are one of its admins).
 */
export const clubsOf = async (req, res) => {
    logger.debug('players clubs called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    const clubs = await db.club.find({ _id: { $in: player.clubs } }, 'name logo admins').sort({ name: 1 });
    res.json(clubs.map(club => ({ id: club._id, name: club.name, logo: club.logo, canManage: canManageClub(req.user, club) })));
};

/**
 * Makes a player of the selected club a member of another club the user runs
 * too; with "move" the player then leaves the selected club.
 */
export const addToOtherClub = async (req, res) => {
    logger.debug('players add to other club called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    const target = await db.club.findById(req.body.club);
    if (!target) return res.status(404).json({ message: 'Club not found.' });
    if (!canManageClub(req.user, target)) {
        return res.status(403).json({ message: 'You can only add players to clubs you are an admin of.' });
    }

    const error = await addToClub(player, target);
    if (error) return res.status(409).json({ message: error });
    if (req.body.move === true) await removeFromClub(player, req.club._id);

    logger.info(`Player "${player.nickname}" ${req.body.move === true ? 'moved' : 'added'} from club "${req.club.name}" to "${target.name}" by ${req.user.email}`);
    res.json(player.toJSON());
};

/**
 * Ends a player's membership in one of the user's clubs. The last club of a
 * player cannot be taken away: a player without a club is deleted instead.
 */
export const removeFromOtherClub = async (req, res) => {
    logger.debug('players remove from club called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    const club = await db.club.findById(req.params.clubId);
    if (!club || !player.clubs.some(id => id.equals(club._id))) {
        return res.status(404).json({ message: 'The player is not a member of this club.' });
    }
    if (!canManageClub(req.user, club)) {
        return res.status(403).json({ message: 'You can only remove players from clubs you are an admin of.' });
    }
    if (player.clubs.length === 1) {
        return res.status(409).json({ message: `This is the only club of ${player.nickname}. Delete the player instead.` });
    }
    await removeFromClub(player, club._id);
    logger.info(`Player "${player.nickname}" removed from club "${club.name}" by ${req.user.email}`);
    res.json(player.toJSON());
};
