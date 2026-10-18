import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { canManageClub, isGlobalAdmin } from '../middleware/auth.middleware.js';
import { syncPlayerBadges } from '../utils/badge.service.js';
import {
    LEVELS, THRESHOLDS, checkClock, checkCricket, checkElimination, checkTraining, checkX01, compact, levelOf, usualAverages,
} from '../utils/integrity.js';

// what can be checked: the games, and the trainings of Around the Clock
const SOURCES = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
    training: () => db.atc,
};

const idOf = (doc) => String(doc._id);
const playersOf = (type, doc) => type === 'training' ? [doc.player?.id].filter(Boolean) : (doc.players ?? []).map(String);

// one line about what was played
const describe = (type, doc) => {
    if (type === 'training') {
        const scoring = doc.scoring === 'Darts' ? `${doc.darts} darts` : `${((doc.timeMs ?? 0) / 100).toFixed(2)} s`;
        return `Around the Clock training · ${doc.mode} · ${scoring}`;
    }
    if (type === 'x01') return `X01 · ${doc.startingScore ?? ''} · ${doc.legInMode ?? ''} / ${doc.legOutMode ?? ''}`;
    if (type === 'cricket') return `Cricket${doc.variant && doc.variant !== 'Standard' ? ` · ${doc.variant}` : ''}`;
    if (type === 'elimination') return `Elimination · ${doc.targetScore}`;
    return `Around the Clock · ${doc.mode}`;
};

/**
 * Every game and training of the club (or, for a global admin with
 * scope=all, of every club) that breaks a rule of fair play, the impossible
 * first: [{ type, id, club: { id, name, logo }, at, summary, players, level,
 * findings, review }].
 */
const collectEntries = async (where) => {
    const [x01, cricket, elimination, clock, trainings, reviews] = await Promise.all([
        db.x01.find({ ...where, hasWinner: true }).lean(),
        db.cricket.find({ ...where, hasWinner: true }).lean(),
        db.elimination.find({ ...where, hasWinner: true }).lean(),
        db.clock.find({ ...where, hasWinner: true }).lean(),
        db.atc.find(where).sort({ createdAt: 1 }).lean(),
        db.integrityReview.find(where).lean(),
    ]);

    const usual = usualAverages(x01);
    const found = [];
    const add = (type, doc, findings) => {
        const list = compact(findings);
        if (list.length) found.push({ type, doc, findings: list });
    };
    x01.forEach(game => add('x01', game, checkX01(game, { usualAverage: usual(idOf(game)) })));
    cricket.forEach(game => add('cricket', game, checkCricket(game)));
    elimination.forEach(game => add('elimination', game, checkElimination(game)));
    clock.forEach(game => add('clock', game, checkClock(game)));
    // each training against the player's earlier ones of the same mode and scoring
    const earlier = new Map();
    for (const entry of trainings) {
        const key = `${entry.player?.id}|${entry.mode}|${entry.scoring ?? 'Time'}`;
        const history = earlier.get(key) ?? [];
        add('training', entry, checkTraining({ ...entry, scoring: entry.scoring ?? 'Time' }, history));
        earlier.set(key, [...history, entry]);
    }

    const playerIds = [...new Set(found.flatMap(({ type, doc }) => playersOf(type, doc)))].filter(id => db.mongoose.isValidObjectId(id));
    const clubIds = [...new Set(found.map(({ doc }) => String(doc.club)))].filter(id => db.mongoose.isValidObjectId(id));
    const [players, clubs] = await Promise.all([
        db.player.find({ _id: { $in: playerIds } }, 'nickname firstname lastname profileImg').lean(),
        db.club.find({ _id: { $in: clubIds } }, 'name logo').lean(),
    ]);
    const playerById = new Map(players.map(player => [String(player._id), player]));
    const clubById = new Map(clubs.map(club => [String(club._id), club]));
    const reviewOf = new Map(reviews.map(review => [`${review.sourceType}|${review.sourceId}`, review]));

    const entries = found.map(({ type, doc, findings }) => {
        const review = reviewOf.get(`${type}|${idOf(doc)}`);
        return {
            type,
            id: idOf(doc),
            club: { id: String(doc.club), name: clubById.get(String(doc.club))?.name ?? '', logo: clubById.get(String(doc.club))?.logo ?? '' },
            at: type === 'training' ? doc.createdAt : doc.updatedAt,
            summary: describe(type, doc),
            players: playersOf(type, doc).map(id => {
                const player = playerById.get(id);
                return { id, nickname: player?.nickname ?? doc.player?.nickname ?? 'Unknown player', firstname: player?.firstname, lastname: player?.lastname, profileImg: player?.profileImg };
            }),
            level: levelOf(findings),
            findings,
            review: review ? { status: review.status, byName: review.byName, at: review.updatedAt } : null,
        };
    }).sort((a, b) => LEVELS[b.level] - LEVELS[a.level] || new Date(b.at) - new Date(a.at));
    return entries;
};

const whereOf = (req) => req.query.scope === 'all' ? {} : { club: req.club._id };

export const scan = async (req, res) => {
    logger.debug('integrity scan called');
    try {
        res.json({ entries: await collectEntries(whereOf(req)), thresholds: THRESHOLDS });
    } catch (err) {
        logger.error(err, 'Failed to check the games for fair play');
        res.status(500).json({ message: 'The games could not be checked.' });
    }
};

/**
 * What is waiting for an admin, for the count in the menu: { impossible,
 * suspicious (not looked at yet), open (the two together) }.
 */
export const summary = async (req, res) => {
    try {
        const entries = await collectEntries(whereOf(req));
        const impossible = entries.filter(entry => entry.level === 'impossible').length;
        const suspicious = entries.filter(entry => entry.level === 'suspicious' && !entry.review).length;
        res.json({ impossible, suspicious, open: impossible + suspicious });
    } catch (err) {
        logger.error(err, 'Failed to count the fair play findings');
        res.status(500).json({ message: 'The games could not be checked.' });
    }
};

// the game or training, if the user may manage its club: [doc, club] or a response sent
const loadManaged = async (req, res) => {
    const { type, id } = req.params;
    const model = SOURCES[type];
    if (!model || !db.mongoose.isValidObjectId(id)) {
        res.status(404).json({ message: 'Not found.' });
        return [];
    }
    const doc = await model().findById(id);
    if (!doc) {
        res.status(404).json({ message: 'Not found.' });
        return [];
    }
    const club = await db.club.findById(doc.club);
    if (!isGlobalAdmin(req.user) && !(club && canManageClub(req.user, club))) {
        res.status(403).json({ message: 'Only admins of its club can do this.' });
        return [];
    }
    return [doc, club];
};

/**
 * Marks a suspicious game or training: { status: 'ok' } looked at and fine,
 * { status: 'watch' } kept on the watch list.
 */
export const review = async (req, res) => {
    const [doc] = await loadManaged(req, res);
    if (!doc) return;
    const { type, id } = req.params;
    const saved = await db.integrityReview.findOneAndUpdate(
        { sourceType: type, sourceId: id },
        { club: doc.club, status: req.body.status, by: req.user._id, byName: `${req.user.firstname} ${req.user.lastname}` },
        { upsert: true, new: true }
    );
    logger.info(`${req.user.email} marked ${type} ${id} as ${req.body.status}`);
    res.json({ status: saved.status, byName: saved.byName, at: saved.updatedAt });
};

/**
 * Deletes games and trainings: { items: [{ type, id }] }. Each one the user may
 * manage goes, with the badges earned in it; every player concerned has their
 * badges worked out once at the end. { deleted, skipped }
 */
export const removeMany = async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const playerIds = new Set();
    const deletedIds = new Set();
    let skipped = 0;
    try {
        for (const { type, id } of items) {
            const model = SOURCES[type];
            const doc = model && db.mongoose.isValidObjectId(id) ? await model().findById(id) : null;
            if (!doc) { skipped += 1; continue; }
            const club = await db.club.findById(doc.club);
            if (!isGlobalAdmin(req.user) && !(club && canManageClub(req.user, club))) { skipped += 1; continue; }
            playersOf(type, doc).filter(playerId => db.mongoose.isValidObjectId(playerId)).forEach(playerId => playerIds.add(playerId));
            await doc.deleteOne();
            await db.integrityReview.deleteMany({ sourceType: type, sourceId: String(id) });
            deletedIds.add(String(id));
        }
        const players = await db.player.find({ _id: { $in: [...playerIds] } });
        for (const player of players) {
            const before = player.badges.length;
            player.badges = player.badges.filter(entry => !deletedIds.has(entry.sourceId));
            if (player.badges.length !== before) await player.save();
            await syncPlayerBadges(player);
        }
        logger.warn(`${req.user.email} deleted ${deletedIds.size} games and trainings for fair play`);
        res.json({ deleted: deletedIds.size, skipped });
    } catch (err) {
        logger.error(err, 'Failed to delete for fair play');
        res.status(500).json({ message: 'Not everything could be deleted.', deleted: deletedIds.size });
    }
};

/**
 * Deletes a game or training that cannot be real, and takes away the badges
 * earned in it (they come back if the player still earned them elsewhere).
 */
export const remove = async (req, res) => {
    const [doc, club] = await loadManaged(req, res);
    if (!doc) return;
    const { type, id } = req.params;
    try {
        const playerIds = playersOf(type, doc).filter(playerId => db.mongoose.isValidObjectId(playerId));
        await doc.deleteOne();
        await db.integrityReview.deleteMany({ sourceType: type, sourceId: id });
        const players = await db.player.find({ _id: { $in: playerIds } });
        for (const player of players) {
            const before = player.badges.length;
            player.badges = player.badges.filter(entry => entry.sourceId !== id);
            if (player.badges.length !== before) await player.save();
            await syncPlayerBadges(player);
        }
        logger.warn(`${req.user.email} deleted ${type} ${id} of club "${club?.name ?? doc.club}" for fair play`);
        res.json({ message: 'Deleted.' });
    } catch (err) {
        logger.error(err, `Failed to delete ${type} ${id}`);
        res.status(500).json({ message: 'It could not be deleted.' });
    }
};
