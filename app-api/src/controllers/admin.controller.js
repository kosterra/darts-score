import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { isMailConfigured } from '../utils/mail.utils.js';

const GAME_MODELS = [db.x01, db.cricket, db.elimination];

/**
 * Counts per club over one collection, as a map from club id to the result.
 */
const perClub = async (model, group) => {
    const rows = await model.aggregate([{ $match: { club: { $ne: null } } }, { $group: { _id: '$club', ...group } }]);
    return new Map(rows.map(row => [String(row._id), row]));
};

/**
 * What a global admin looks after: every club with its admins and activity,
 * totals and the state of the installation.
 */
export const overview = async (req, res) => {
    logger.debug('admin overview called');
    const [clubs, players, gameStats, userCount, migrations, dbStats] = await Promise.all([
        db.club.find({}).sort({ name: 1 }).populate('admins', 'firstname lastname email role'),
        perClub(db.player, { count: { $sum: { $cond: [{ $eq: ['$guest', true] }, 0, 1] } } }),
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
            players: clubRows.reduce((sum, club) => sum + club.playerCount, 0),
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
    const all = await db.club.find({}, 'name logo').sort({ name: 1 });
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
    const found = await db.club.find({ _id: { $in: ids } }, 'name logo');
    return new Map(found.map(club => [String(club._id), { id: club._id, name: club.name, logo: club.logo }]));
};

// each record tells which club it belongs to
const withClub = (clubsById, extra = {}) => (doc) => ({ ...doc.toJSON(), ...extra, club: clubsById.get(String(doc.club)) });

export const players = async (req, res) => {
    logger.debug('admin players called');
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const found = await db.player.find({ club: { $in: [...clubsById.keys()] } }).sort({ nickname: 1 });
    res.json(found.map(withClub(clubsById)));
};

export const games = async (req, res) => {
    logger.debug('admin games called');
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const filter = { club: { $in: [...clubsById.keys()] } };
    const [x01, cricket, elimination] = await Promise.all(GAME_MODELS.map(model => model.find(filter).sort({ createdAt: -1 })));
    res.json([
        ...x01.map(withClub(clubsById, { type: 'x01' })),
        ...cricket.map(withClub(clubsById, { type: 'cricket' })),
        ...elimination.map(withClub(clubsById, { type: 'elimination' })),
    ]);
};

export const trainings = async (req, res) => {
    logger.debug('admin trainings called');
    const clubsById = await selectedClubs(req, res);
    if (!clubsById) return;
    const found = await db.atc.find({ club: { $in: [...clubsById.keys()] } }).sort({ createdAt: -1 });
    res.json(found.map(withClub(clubsById)));
};
