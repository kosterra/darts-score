import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { isMailConfigured } from '../utils/mail.utils.js';
import { addToClub, removeFromClub } from './player.controller.js';
import { removeProfileImageIfUnused } from '../utils/player.images.js';
import { withHumans } from './x01.training.controller.js';
import { withPlayers } from './atc.controller.js';

const GAME_MODELS = [db.x01, db.cricket, db.elimination, db.clock, db.rulesGame];

/**
 * Counts per club over one collection, as a map from club id to the result.
 */
const perClub = async (model, group) => {
    const rows = await model.aggregate([{ $match: { club: { $ne: null } } }, { $group: { _id: '$club', ...group } }]);
    return new Map(rows.map(row => [String(row._id), row]));
};

/**
 * Members per club, guests left out; a player counts in each of their clubs.
 */
const membersPerClub = async () => {
    const rows = await db.player.aggregate([
        { $match: { guest: { $ne: true } } },
        { $unwind: '$clubs' },
        { $group: { _id: '$clubs', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map(row => [String(row._id), row]));
};

/**
 * What a global admin looks after: every club with its admins and activity,
 * totals and the state of the installation.
 */
export const overview = async (req, res) => {
    logger.debug('admin overview called');
    const [clubs, players, playerTotal, gameStats, userCount, migrations, dbStats] = await Promise.all([
        db.club.find({}).sort({ name: 1 }).populate('admins', 'firstname lastname email role'),
        membersPerClub(),
        // each person once, even when they play in several clubs
        db.player.countDocuments({ guest: { $ne: true }, 'clubs.0': { $exists: true } }),
        Promise.all(GAME_MODELS.map(model => perClub(model, { count: { $sum: 1 }, last: { $max: '$updatedAt' } }))),
        db.user.countDocuments(),
        db.mongoose.connection.collection('migrations').find({}).sort({ appliedAt: 1 }).toArray(),
        db.mongoose.connection.db.stats().catch(() => null),
    ]);

    const clubRows = clubs.map(club => {
        const id = String(club._id);
        const games = gameStats.map(stats => stats.get(id));
        const lastGameAt = games.map(game => game?.last).filter(Boolean).sort((a, b) => b - a)[0] ?? null;
        const admins = club.admins.map(admin => admin.toJSON());
        return {
            id: club._id,
            name: club.name,
            logo: club.logo,
            isPublic: club.isPublic,
            createdAt: club.createdAt,
            admins,
            // looked after by global admins only, e.g. the default club right after an upgrade
            needsAdmin: admins.every(admin => admin.role === ROLES.GLOBAL_ADMIN),
            playerCount: players.get(id)?.count ?? 0,
            gameCount: games.reduce((sum, game) => sum + (game?.count ?? 0), 0),
            lastActivityAt: lastGameAt ?? club.updatedAt,
        };
    });

    res.json({
        totals: {
            clubs: clubRows.length,
            users: userCount,
            players: playerTotal,
            games: clubRows.reduce((sum, club) => sum + club.gameCount, 0),
        },
        clubs: clubRows,
        system: {
            nodeVersion: process.version,
            environment: process.env.NODE_ENV ?? 'production',
            mailEnabled: isMailConfigured(),
            databaseSize: dbStats ? dbStats.dataSize + dbStats.indexSize : null,
            migrations: migrations.map(migration => ({ id: migration._id, appliedAt: migration.appliedAt })),
        },
    });
};

/**
 * Every club, for the club filter of the admin lists.
 */
export const clubs = async (req, res) => {
    const all = await db.club.find({}, 'name logo country').sort({ name: 1 });
    res.json(all.map(club => ({ id: club._id, name: club.name, logo: club.logo })));
};

/**
 * The clubs named in ?clubs=id1,id2 — the admin lists always need at least
 * one, so they never load the whole installation at once.
 */
const selectedClubs = async (req, res) => {
    const ids = String(req.query.clubs ?? '').split(',').map(id => id.trim()).filter(Boolean);
    if (!ids.length || !ids.every(id => db.mongoose.isValidObjectId(id))) {
        res.status(400).json({ message: 'Choose at least one club.' });
        return null;
    }
    const found = await db.club.find({ _id: { $in: ids } }, 'name logo country');
    return new Map(found.map(club => [String(club._id), { id: club._id, name: club.name, logo: club.logo }]));
};

// each record tells which club it belongs to
const withClub = (clubsById, extra = {}) => (doc) => ({ ...doc.toJSON(), ...extra, club: clubsById.get(String(doc.club)) });

/**
 * Players of the chosen clubs, each with all the clubs they are a member of.
 */
export const players = async (req, res) => {
    logger.debug('admin players called');
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const [found, allClubs] = await Promise.all([
        db.player.find({ clubs: { $in: [...clubsById.keys()] } }).sort({ nickname: 1 }),
        db.club.find({}, 'name logo country'),
    ]);
    const clubInfo = new Map(allClubs.map(club => [String(club._id), { id: club._id, name: club.name, logo: club.logo }]));
    res.json(found.map(player => ({
        ...player.toJSON(),
        clubs: player.clubs.map(id => clubInfo.get(String(id))).filter(Boolean),
    })));
};

const loadPlayer = async (req, res) => {
    const player = db.mongoose.isValidObjectId(req.params.id) ? await db.player.findById(req.params.id) : null;
    if (!player) res.status(404).json({ message: 'Player not found.' });
    return player;
};

/**
 * Makes a player a member of one more club.
 */
export const addPlayerToClub = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    const club = await db.club.findById(req.body.club);
    if (!club) return res.status(404).json({ message: 'Club not found.' });

    const error = await addToClub(player, club);
    if (error) return res.status(409).json({ message: error });
    logger.info(`Player "${player.nickname}" added to club "${club.name}" by ${req.user.email}`);
    res.json(player);
};

/**
 * Ends a player's membership in a club. The last club cannot be taken away:
 * a player without a club is deleted instead.
 */
export const removePlayerFromClub = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    const clubId = req.params.clubId;
    if (!player.clubs.some(id => id.equals(clubId))) {
        return res.status(404).json({ message: 'The player is not a member of this club.' });
    }
    if (player.clubs.length === 1) {
        return res.status(409).json({ message: `This is the only club of ${player.nickname}. Delete the player instead.` });
    }
    await removeFromClub(player, player.clubs.find(id => id.equals(clubId)));
    logger.info(`Player "${player.nickname}" removed from a club by ${req.user.email}`);
    res.json(player);
};

/**
 * Deletes a player from every club. Their games stay, without the name.
 */
export const deletePlayer = async (req, res) => {
    const player = await loadPlayer(req, res);
    if (!player) return;
    await player.deleteOne();
    await removeProfileImageIfUnused(player.profileImg);
    logger.info(`Player "${player.nickname}" deleted by ${req.user.email}`);
    res.json({ message: 'Player deleted.' });
};

export const games = async (req, res) => {
    logger.debug('admin games called');
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const filter = { club: { $in: [...clubsById.keys()] } };
    const [x01, cricket, elimination, clock, rules] = await Promise.all(GAME_MODELS.map(model => model.find(filter).sort({ createdAt: -1 })));
    res.json([
        ...x01.map(withClub(clubsById, { type: 'x01' })),
        ...cricket.map(withClub(clubsById, { type: 'cricket' })),
        ...elimination.map(withClub(clubsById, { type: 'elimination' })),
        ...clock.map(withClub(clubsById, { type: 'clock' })),
        // the games of the rules engine are typed by their kind
        ...rules.map(withClub(clubsById)),
    ]);
};

// X01 trainings against the bot of the chosen clubs, with their club and player
export const x01Trainings = async (req, res) => {
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const found = await db.x01Training.find({ club: { $in: [...clubsById.keys()] } }).sort({ createdAt: -1 });
    res.json(await withHumans(found.map(withClub(clubsById))));
};

// the trainings of the rules engine (Bob's 27, 121 Checkout, …) of the chosen clubs
export const rulesTrainings = async (req, res) => {
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const found = await db.rulesTraining.find({ club: { $in: [...clubsById.keys()] } }).sort({ createdAt: -1 });
    res.json(await withPlayers(found.map(withClub(clubsById))));
};

export const trainings = async (req, res) => {
    logger.debug('admin trainings called');
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const found = await db.atc.find({ club: { $in: [...clubsById.keys()] } }).sort({ createdAt: -1 });
    res.json(await withPlayers(found.map(withClub(clubsById))));
};
