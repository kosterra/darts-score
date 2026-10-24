import { loadFlightStanding } from '../utils/flight.service.js';
import { mayUse, unlockCheck } from '../utils/flights.js';
import logger from '../models/logger.model.js';
import { noteCreated, noteDeleted, checkLater } from '../utils/spam.guard.js';
import db from '../models/db.model.js';
import { removeProfileImageFile } from './file.controller.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { inClub, knownInClub } from '../models/player.model.js';
import { findOrCreateAccount } from '../utils/accounts.js';
import { sendClubWelcomeMail } from '../utils/mail.service.js';
import { canManageClub } from '../middleware/auth.middleware.js';
import { checkoutProfile } from '../utils/checkout.profile.js';
import { relocateHistory } from '../utils/history.relocation.js';
import { removeProfileImageIfUnused } from '../utils/player.images.js';
import { ownBirthChange, selfBirthAge } from '../utils/birth.rules.js';
import { NO_CLUB_FOR_GLOBAL_ADMINS, isGlobalAdminAccount } from '../utils/global.admins.js';

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
    if (isGlobalAdminAccount(req.user)) return res.status(403).json({ message: NO_CLUB_FOR_GLOBAL_ADMINS });
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
    const latest = await Promise.all([db.x01, db.cricket, db.elimination, db.clock].map(model =>
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

/**
 * How the players finish and score, for the ways out of a game:
 * { [playerId]: checkout profile }, learned from all their X01 games (it is
 * the person's skill, whichever club they played in) and their preferences.
 */
export const checkoutProfiles = async (req, res) => {
    logger.debug('players checkout profiles called');
    const ids = req.body.playerIds.filter(id => db.mongoose.isValidObjectId(id));
    const players = await Player.find({ _id: { $in: ids }, ...knownInClub(req.club._id) }, 'preferences guest').lean();
    const profiles = {};
    for (const player of players) {
        const id = String(player._id);
        const games = await db.x01.find({ players: id }, { [`playerModels.${id}.checkout.sections`]: 1, [`playerModels.${id}.hit`]: 1 }).lean();
        profiles[id] = checkoutProfile(games, id, player.preferences);
    }
    res.send(profiles);
};

export const findOne = async (req, res) => {
    logger.debug('players find one called!');
    const player = await findInClub(req, knownInClub);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    // club admins also see the account a player logs in with (on the page to edit the player)
    res.send((await toClient([player], req))[0]);
};

export const update = async (req, res) => {
    logger.debug('players update called!');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });

    // Players may edit their own entry, everything else is for club admins
    const isAdmin = req.clubRole === CLUB_ROLES.ADMIN;
    const isOwnPlayer = Boolean(player.user && player.user.equals(req.user._id));
    if (!isAdmin && !isOwnPlayer) {
        if (req.file) removeProfileImageFile(req.file.filename);
        return res.status(403).send({ message: 'Only club admins can edit other players.' });
    }
    const birth = req.body.dateOfBirth || null;

    // a player with a login maintains their name, nickname and picture themselves:
    // their admins only set the date of birth (it decides the handicap and the Hall of Shame of children)
    if (player.user && !isOwnPlayer) {
        if (req.file) removeProfileImageFile(req.file.filename);
        if (birth) player.dateOfBirth = birth;
        await player.save();
        return res.send({ message: 'Player was updated successfully.', maintainedByPlayer: true });
    }

    if (!req.body.nickname) {
        if (req.file) removeProfileImageFile(req.file.filename);
        return res.status(422).json({ errors: ['Nickname is required.'] });
    }
    if (!player.user && (!req.body.firstname || !req.body.lastname)) {
        if (req.file) removeProfileImageFile(req.file.filename);
        return res.status(422).json({ errors: ['Firstname and lastname are required.'] });
    }

    // adults correct their own date of birth, never to a child's (see birth.rules)
    const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
    const ownBirth = !isAdmin && birth && day(birth) !== day(player.dateOfBirth);
    if (ownBirth) {
        const clubs = await db.club.find({ _id: { $in: player.clubs } }, 'shameMinAge').lean();
        const change = ownBirthChange(player.dateOfBirth, birth, selfBirthAge(clubs));
        if (!change.allowed) {
            if (req.file) removeProfileImageFile(req.file.filename);
            return res.status(403).json({ message: change.reason });
        }
    }

    const previousImg = player.profileImg;
    // with a login the name is the account's
    player.firstname = player.user ? req.user.firstname : req.body.firstname;
    player.lastname = player.user ? req.user.lastname : req.body.lastname;
    player.nickname = req.body.nickname;
    if (typeof req.body.country === 'string') player.country = req.body.country.toUpperCase();
    if (ownBirth) player.birthChanges.push({ from: player.dateOfBirth, to: birth, at: new Date() });
    if ((isAdmin || ownBirth) && birth) player.dateOfBirth = birth;
    if (req.file) player.profileImg = req.file.filename;
    else if (req.body.clearProfileImg === 'true') player.profileImg = '';
    await player.save();

    // the players of one account are one person: they share the picture
    const replaced = [previousImg];
    if (player.user && previousImg !== player.profileImg) {
        const others = await Player.find({ user: player.user, _id: { $ne: player._id } }, 'profileImg');
        replaced.push(...others.map(other => other.profileImg));
        await Player.updateMany({ user: player.user, _id: { $ne: player._id } }, { $set: { profileImg: player.profileImg } });
    }
    // ... and come from one country
    if (player.user) await Player.updateMany({ user: player.user, _id: { $ne: player._id } }, { $set: { country: player.country } });
    // Only drop an old file once no player uses it any more
    for (const img of new Set(replaced)) {
        if (img && img !== player.profileImg) await removeProfileImageIfUnused(img);
    }
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
    checkLater(() => noteDeleted(req, 'player'));
    await removeProfileImageIfUnused(player.profileImg);
    res.send({ message: 'Player was deleted successfully!', removed: 'player' });
};

/**
 * Ends a player's membership in a club; the club remembers them as a former member.
 */
export const removeFromClub = async (player, clubId) => {
    player.clubs = player.clubs.filter(id => !id.equals(clubId));
    if (!player.formerClubs.some(id => id.equals(clubId))) player.formerClubs.push(clubId);
    await player.save();
    // games among players who all left for the same club go along with them
    await relocateHistory([player._id]);
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
    // joining after leaving: the games left behind can follow now
    await relocateHistory([player._id]);
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
    if (isGlobalAdminAccount(user)) return res.status(409).json({ message: `${user.email} is a global admin. ${NO_CLUB_FOR_GLOBAL_ADMINS}` });

    // one account is one player per club, also in the player's other clubs
    const other = await Player.findOne({ clubs: { $in: player.clubs }, user: user._id, _id: { $ne: player._id } });
    if (other) {
        return res.status(409).json({ message: `This account already plays as ${other.nickname} in a club of this player.` });
    }

    player.user = user._id;
    // the player is the account's from now on: its name, and one picture for all its players
    player.firstname = user.firstname;
    player.lastname = user.lastname;
    const pictured = await Player.findOne({ user: user._id, _id: { $ne: player._id }, profileImg: { $nin: ['', null] } }, 'profileImg');
    if (pictured) {
        const previousImg = player.profileImg;
        player.profileImg = pictured.profileImg;
        await player.save();
        if (previousImg && previousImg !== player.profileImg) await removeProfileImageIfUnused(previousImg);
    } else {
        await player.save();
        if (player.profileImg) await Player.updateMany({ user: user._id, _id: { $ne: player._id } }, { $set: { profileImg: player.profileImg } });
    }
    logger.info(`${user.email} can now log in as player "${player.nickname}" of club "${req.club.name}"`);

    sendClubWelcomeMail(user, inviteLink, 'player', { club: req.club.name, inviter: `${req.user.firstname} ${req.user.lastname}`, nickname: player.nickname, language: req.user.language });

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

    // whether a name is public is up to the person: a player with a login decides
    // themselves, the club admins only for the players without one
    const isOwnPlayer = player.user && player.user.equals(req.user._id);
    if (player.user && !isOwnPlayer) {
        return res.status(403).send({ message: `${player.nickname} has a login and decides this on their player profile.` });
    }
    if (req.clubRole !== CLUB_ROLES.ADMIN && !isOwnPlayer) {
        return res.status(403).send({ message: 'Only club admins can change this for other players.' });
    }

    player.publicProfile = req.body.publicProfile;
    await player.save();
    res.send((await toClient([player], req))[0]);
};

/**
 * Whether the other players of the club see a player's trainings. Club
 * admins decide for everyone, players with a login for themselves.
 */
export const setTrainingPrivacy = async (req, res) => {
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    const isOwnPlayer = player.user && player.user.equals(req.user._id);
    if (req.clubRole !== CLUB_ROLES.ADMIN && !isOwnPlayer) {
        return res.status(403).send({ message: 'Only club admins can change this for other players.' });
    }
    player.privateTrainings = req.body.privateTrainings;
    await player.save();
    res.send((await toClient([player], req))[0]);
};

/**
 * A player's favourite double and main treble for the ways out ("auto" learns
 * them from the games), how their darts fly onto the board in X01, and
 * whether they play with a handicap.
 * Club admins, or the player themselves.
 */
export const setPreferences = async (req, res) => {
    logger.debug('players set preferences called');
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });

    const isOwnPlayer = player.user && player.user.equals(req.user._id);
    if (req.clubRole !== CLUB_ROLES.ADMIN && !isOwnPlayer) {
        return res.status(403).send({ message: 'Only club admins can change this for other players.' });
    }

    // a flight shape or design is flown once the player has it
    const wanted = [['shape', req.body.flightShape], ['design', req.body.flightPattern], ['barrel', req.body.barrel]].filter(([, id]) => id);
    if (wanted.length) {
        const standing = await loadFlightStanding(player);
        const missing = wanted.find(([kind, id]) => !mayUse(standing, kind, id));
        if (missing) return res.status(403).send({ message: 'Unlock this flight first.' });
    }

    const current = player.preferences ?? {};
    player.preferences = {
        favouriteDouble: req.body.favouriteDouble ?? current.favouriteDouble ?? 'auto',
        mainTreble: req.body.mainTreble ?? current.mainTreble ?? 'auto',
        flyingDarts: req.body.flyingDarts ?? current.flyingDarts ?? false,
        flightColor: req.body.flightColor ?? current.flightColor ?? 'auto',
        flightPattern: req.body.flightPattern ?? current.flightPattern ?? 'plain',
        flightShape: req.body.flightShape ?? current.flightShape ?? 'standard',
        barrel: req.body.barrel ?? current.barrel ?? 'classic',
        // whether the player plays with a handicap when the others want one
        handicap: req.body.handicap ?? current.handicap ?? 'accept',
    };
    await player.save();
    res.send(player.toJSON());
};

/**
 * Where a player stands with the flights: their flight points and every
 * shape and design, owned, to unlock or still locked.
 */
export const flights = async (req, res) => {
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    try {
        res.send(await loadFlightStanding(player));
    } catch (err) {
        logger.error(err, `Failed to work out the flights of player ${player._id}`);
        res.status(500).send({ message: 'The flights could not be loaded.' });
    }
};

/**
 * Unlocks a flight shape, design or barrel with the player's flight points:
 * { kind: 'shape' | 'design' | 'barrel', id }. The player themselves, or a club admin
 * for a player without a login. Answers with the new standing.
 */
export const unlockFlight = async (req, res) => {
    const player = await findInClub(req);
    if (!player) return res.status(404).send({ message: 'Player not found.' });
    const isOwnPlayer = player.user && player.user.equals(req.user._id);
    if (req.clubRole !== CLUB_ROLES.ADMIN && !isOwnPlayer) {
        return res.status(403).send({ message: 'Only the player can unlock their flights.' });
    }
    try {
        const check = unlockCheck(await loadFlightStanding(player), req.body.kind, req.body.id);
        if (!check.ok) return res.status(409).send({ message: check.reason });
        player.flights = { unlocked: [...(player.flights?.unlocked ?? []), check.key] };
        await player.save();
        logger.info(`${player.nickname} unlocked the flight ${check.key}`);
        res.send(await loadFlightStanding(player));
    } catch (err) {
        logger.error(err, `Failed to unlock a flight of player ${player._id}`);
        res.status(500).send({ message: 'The flight could not be unlocked.' });
    }
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
