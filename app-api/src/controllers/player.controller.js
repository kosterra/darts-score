import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { removeProfileImageFile } from './file.controller.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { findOrCreateAccount, sendClubWelcomeMail } from '../utils/accounts.js';

const Player = db.player;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every lookup is limited to the club the request works on
const findInClub = (req) =>
    db.mongoose.isValidObjectId(req.params.id)
        ? Player.findOne({ _id: req.params.id, club: req.club._id })
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
        profileImg: req.file ? req.file.filename : '',
        club: req.club._id,
    });
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
        club: req.club._id,
    });
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
    if (await Player.exists({ club: req.club._id, user: req.user._id })) {
        return res.status(409).json({ message: 'You are already a player of this club.' });
    }
    const player = await Player.create({
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        nickname: req.body.nickname,
        club: req.club._id,
        user: req.user._id,
    });
    res.status(201).send(player.toJSON());
};

// Guests are left out unless a list asks for them (game history needs their names)
const memberFilter = (req) => ({
    club: req.club._id,
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

export const findByIds = async (req, res) => {
    logger.debug('players find by ids called!');
    const ids = req.body.playerIds.filter(id => db.mongoose.isValidObjectId(id));
    const players = await Player.find({ _id: { $in: ids }, club: req.club._id });
    res.send(players.map(p => p.toJSON()));
};

export const findOne = async (req, res) => {
    logger.debug('players find one called!');
    const player = await findInClub(req);
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

    await player.deleteOne();
    removeProfileImageFile(player.profileImg);
    res.send({ message: 'Player was deleted successfully!' });
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

    const other = await Player.findOne({ club: req.club._id, user: user._id, _id: { $ne: player._id } });
    if (other) {
        return res.status(409).json({ message: `This account already plays in this club as ${other.nickname}.` });
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
