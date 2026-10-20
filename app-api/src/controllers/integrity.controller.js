import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { canManageClub, isGlobalAdmin } from '../middleware/auth.middleware.js';
import { removeWithBadges, syncPlayerBadges } from '../utils/badge.service.js';
import {
    LEVELS, THRESHOLDS, checkBirthChange, checkClock, checkCricket, checkElimination, checkTraining, checkX01, compact, levelOf, repairX01, usualAverages, x01Legs,
} from '../utils/integrity.js';
import { fairPlayNotices } from '../utils/notices.js';

// what can be checked: the games, and the trainings of Around the Clock
const SOURCES = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
    training: () => db.atc,
};

const CHECKS = {
    x01: (doc) => checkX01(doc),
    cricket: checkCricket,
    elimination: checkElimination,
    clock: checkClock,
    training: (doc) => checkTraining({ ...doc, scoring: doc.scoring ?? 'Time' }),
};

const idOf = (doc) => String(doc._id);
const playersOf = (type, doc) => type === 'training' ? [doc.player?.id].filter(Boolean) : (doc.players ?? []).map(String);

// one line about what was played
export const describe = (type, doc) => {
    if (type === 'training') {
        const scoring = doc.scoring === 'Darts' ? `${doc.darts} darts` : `${((doc.timeMs ?? 0) / 100).toFixed(2)} s`;
        return `Around the Clock training · ${doc.mode} · ${scoring}`;
    }
    if (type === 'x01') return `X01 · ${doc.startingScore ?? ''} · ${doc.legInMode ?? ''} / ${doc.legOutMode ?? ''}`;
    if (type === 'cricket') return `Cricket${doc.variant && doc.variant !== 'Standard' ? ` · ${doc.variant}` : ''}`;
    if (type === 'elimination') return `Elimination · ${doc.targetScore}`;
    return `Around the Clock · ${doc.mode}`;
};

const playerView = (player) => ({ id: String(player._id), nickname: player.nickname, firstname: player.firstname, lastname: player.lastname, profileImg: player.profileImg });

// when the player played in the club: games and trainings
const playedDates = async (playerId, clubId) => {
    const id = String(playerId);
    const lists = await Promise.all([
        ...[db.x01, db.cricket, db.elimination, db.clock].map(model => model.find({ club: clubId, players: id }, 'createdAt').lean()),
        db.atc.find({ club: clubId, 'player.id': id }, 'createdAt').lean(),
    ]);
    return lists.flat().map(doc => doc.createdAt);
};

/**
 * Players who made themselves younger, as entries of the list: one per change
 * not put back yet, in the club asked for (or, across all clubs, the first of
 * the player's clubs).
 */
const birthChangeEntries = async (where, reviews) => {
    const players = await db.player.find({ 'birthChanges.0': { $exists: true }, ...(where.club ? { clubs: where.club } : {}) }).lean();
    if (!players.length) return [];
    const clubIds = [...new Set(players.map(player => String(where.club ?? player.clubs?.[0])).filter(Boolean))];
    const clubs = await db.club.find({ _id: { $in: clubIds } }, 'name logo shameMinAge').lean();
    const clubById = new Map(clubs.map(club => [String(club._id), club]));
    const reviewOf = new Map(reviews.filter(review => review.sourceType === 'birth').map(review => [review.sourceId, review]));
    const entries = [];
    for (const player of players) {
        const club = clubById.get(String(where.club ?? player.clubs?.[0]));
        if (!club) continue;
        for (const change of player.birthChanges.filter(item => !item.restoredAt)) {
            const findings = checkBirthChange(change, { minAge: club.shameMinAge ?? 16, gameDates: await playedDates(player._id, club._id) });
            if (!findings.length) continue;
            const review = reviewOf.get(String(change._id));
            entries.push({
                type: 'birth',
                id: String(change._id),
                club: { id: String(club._id), name: club.name, logo: club.logo ?? '' },
                at: change.at,
                summary: 'Date of birth changed by the player',
                players: [playerView(player)],
                level: levelOf(findings),
                findings: findings.map(item => ({ ...item, playerId: String(player._id) })),
                review: review ? { status: review.status, reason: review.reason ?? '', byName: review.byName, at: review.updatedAt } : null,
            });
        }
    }
    return entries;
};

// a date of birth change, if the user may manage one of the player's clubs: { player, change, club } or a response sent
const loadBirthChange = async (req, res) => {
    const player = db.mongoose.isValidObjectId(req.params.id) ? await db.player.findOne({ 'birthChanges._id': req.params.id }) : null;
    const change = player?.birthChanges.id(req.params.id);
    if (!change) {
        res.status(404).json({ message: 'Not found.' });
        return {};
    }
    const clubs = await db.club.find({ _id: { $in: player.clubs } });
    const club = isGlobalAdmin(req.user) ? clubs[0] : clubs.find(item => canManageClub(req.user, item));
    if (!club) {
        res.status(403).json({ message: 'Only admins of the player\'s club can do this.' });
        return {};
    }
    return { player, change, club };
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

    const birthEntries = await birthChangeEntries(where, reviews);

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
            review: review ? { status: review.status, reason: review.reason ?? '', byName: review.byName, at: review.updatedAt } : null,
            ...repairOf(type, doc, findings),
        };
    });
    return [...entries, ...birthEntries].sort((a, b) => LEVELS[b.level] - LEVELS[a.level] || new Date(b.at) - new Date(a.at));
};

// a data error of X01 can be repaired when every leg still ends the same way: { repairable, repairReason }
const repairOf = (type, doc, findings) => {
    if (type !== 'x01' || levelOf(findings) !== 'error') return {};
    const repair = repairX01(doc);
    return { repairable: repair.possible, repairReason: repair.possible ? '' : repair.reason };
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
 * What is waiting for an admin, for the count in the menu: { impossible (not
 * marked as fine), errors and suspicious (not looked at yet), open (all together) }.
 */
export const summary = async (req, res) => {
    try {
        const entries = await collectEntries(whereOf(req));
        const impossible = entries.filter(entry => entry.level === 'impossible' && entry.review?.status !== 'ok').length;
        const errors = entries.filter(entry => entry.level === 'error' && !entry.review).length;
        const suspicious = entries.filter(entry => entry.level === 'suspicious' && !entry.review).length;
        res.json({ impossible, errors, suspicious, open: impossible + errors + suspicious });
    } catch (err) {
        logger.error(err, 'Failed to count the fair play findings');
        res.status(500).json({ message: 'The games could not be checked.' });
    }
};

const nameOf = (user) => `${user.firstname} ${user.lastname}`;

// what a notification says about a game or training: the worst findings are the reasons
const itemOf = (type, doc, club, players, findings = compact(CHECKS[type](doc))) => {
    const worst = levelOf(findings);
    const byId = new Map(players.map(player => [String(player._id), player]));
    return {
        type,
        id: idOf(doc),
        club: { id: String(doc.club), name: club?.name ?? '' },
        summary: describe(type, doc),
        at: type === 'training' ? doc.createdAt : doc.updatedAt,
        players: playersOf(type, doc).map(playerId => ({
            nickname: byId.get(playerId)?.nickname ?? doc.player?.nickname ?? '',
            user: byId.get(playerId)?.user ? String(byId.get(playerId).user) : null,
        })),
        admins: (club?.admins ?? []).map(String),
        reasons: [...new Set(findings.filter(item => item.level === worst).map(item => item.title))],
    };
};

// tells the players and the club admins; a failure only costs the notifications
const notify = async (items, action, user) => {
    try {
        const notices = fairPlayNotices(items, action, { id: String(user._id), name: nameOf(user) });
        if (notices.length) await db.notification.insertMany(notices);
    } catch (err) {
        logger.error(err, 'Failed to send the fair play notifications');
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
 * Marks a game or training: { status: 'ok', reason } looked at and fine (no
 * cheat, e.g. a false alarm), { status: 'watch', reason } kept on the watch list.
 */
export const review = async (req, res) => {
    const { type, id } = req.params;
    let doc;
    if (type === 'birth') {
        const { club } = await loadBirthChange(req, res);
        if (!club) return;
        doc = { club: club._id };
    } else {
        [doc] = await loadManaged(req, res);
        if (!doc) return;
    }
    const reason = String(req.body.reason ?? '').trim();
    const saved = await db.integrityReview.findOneAndUpdate(
        { sourceType: type, sourceId: id },
        { club: doc.club, status: req.body.status, reason, by: req.user._id, byName: nameOf(req.user) },
        { upsert: true, new: true }
    );
    logger.info(`${req.user.email} marked ${type} ${id} as ${req.body.status}${reason ? `: ${reason}` : ''}`);
    res.json({ status: saved.status, reason: saved.reason ?? '', byName: saved.byName, at: saved.updatedAt });
};

/**
 * A closer look at a game or training: what was thrown, so an admin can see
 * the finding for themselves. X01: { legs } with each visit's rest as saved,
 * as it should be and as a repair would save it; Cricket and Elimination:
 * { visits }; Around the Clock and trainings: { facts }.
 */
export const details = async (req, res) => {
    const { type } = req.params;
    if (type === 'birth') {
        const { player, change, club } = await loadBirthChange(req, res);
        if (!player) return;
        const findings = checkBirthChange(change, { minAge: club.shameMinAge ?? 16, gameDates: await playedDates(player._id, club._id) });
        const day = (value) => new Date(value).toISOString();
        return res.json({
            type,
            findings,
            facts: [
                ['Before', day(change.from)],
                ['Changed to', day(change.to)],
                ['Changed on', day(change.at)],
                ['Age limit of the club', `${club.shameMinAge ?? 16} years`],
            ],
        });
    }
    const [doc] = await loadManaged(req, res);
    if (!doc) return;
    const plain = doc.toObject();
    const findings = compact(CHECKS[type](plain));
    const result = { type, findings, ...repairOf(type, plain, findings) };
    if (type === 'x01') {
        result.legs = x01Legs(plain);
    } else if (type === 'cricket' || type === 'elimination') {
        result.visits = (plain.allThrows ?? []).map(visit => ({
            playerId: visit?.playerId ?? null,
            darts: (visit?.darts ?? []).filter(dart => dart !== '' && dart != null),
            roundScore: visit?.roundScore ?? null,
            scoreLeft: visit?.scoreLeft ?? null,
            bust: Boolean(visit?.bust),
        }));
    } else if (type === 'training') {
        result.facts = [
            ['Mode', plain.mode],
            ['Scoring', plain.scoring === 'Darts' ? 'Fewest darts' : 'Against the clock'],
            plain.scoring === 'Darts' ? ['Darts', String(plain.darts)] : ['Time', `${((plain.timeMs ?? 0) / 100).toFixed(2)} s`],
            ...(Array.isArray(plain.dartsPerTarget) && plain.dartsPerTarget.length ? [['Darts per target', plain.dartsPerTarget.join(' · ')]] : []),
            ['Saved', new Date(plain.createdAt).toISOString()],
        ];
    } else {
        result.facts = (plain.players ?? []).map(id => {
            const model = plain.playerModels?.[id] ?? {};
            return [id, `${model.darts ?? 0} darts, ${model.hits ?? 0} hits`];
        });
        result.facts.unshift(['Mode', `${plain.mode}${plain.skipAhead ? ', skipping ahead' : ''}`]);
    }
    res.json(result);
};

/**
 * Puts back the date of birth a player had before they made themselves
 * younger, and tells them.
 */
export const restoreBirth = async (req, res) => {
    const { player, change, club } = await loadBirthChange(req, res);
    if (!player) return;
    player.dateOfBirth = change.from;
    change.restoredAt = new Date();
    await player.save();
    await db.integrityReview.deleteMany({ sourceType: 'birth', sourceId: String(change._id) });
    if (player.user && String(player.user) !== String(req.user._id)) {
        const day = (value) => { const date = new Date(value); return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`; };
        await db.notification.create({
            user: player.user,
            kind: 'fairPlayRestored',
            title: 'Your date of birth was set back',
            body: `In ${club.name} your date of birth went back from ${day(change.to)} to ${day(change.from)}: a later date would have counted games you played as an adult as played as a child. Your club admins can correct it if it is wrong.`,
            link: '/player-profile',
            club: club._id,
            by: req.user._id,
            byName: nameOf(req.user),
        }).catch(err => logger.error(err, 'Failed to send the notification'));
    }
    logger.warn(`${req.user.email} put back the date of birth of player "${player.nickname}" for fair play`);
    res.json({ restored: true });
};

/**
 * Repairs a data error of X01: the scores left are worked out again from the
 * darts. Only when every leg still ends the same way; the badges are worked
 * out again, since checkouts count in them.
 */
export const repair = async (req, res) => {
    const [doc, club] = await loadManaged(req, res);
    if (!doc) return;
    const { type, id } = req.params;
    if (type !== 'x01') return res.status(400).json({ message: 'Only X01 games can be repaired.' });
    const plain = doc.toObject();
    const findings = compact(checkX01(plain));
    const fixed = repairX01(plain);
    if (!fixed.possible) return res.status(409).json({ message: `It cannot be repaired: ${fixed.reason}.` });
    try {
        // the raw collection keeps when the game was played (updatedAt)
        await db.x01.collection.updateOne({ _id: doc._id }, { $set: { allSetsThrows: fixed.allSetsThrows } });
        const players = await db.player.find({ _id: { $in: playersOf(type, doc).filter(playerId => db.mongoose.isValidObjectId(playerId)) } });
        for (const player of players) await syncPlayerBadges(player);
        await notify([itemOf(type, plain, club, players, findings)], 'repaired', req.user);
        logger.warn(`${req.user.email} repaired ${fixed.changed} scores left of x01 ${id} of club "${club?.name ?? doc.club}"`);
        res.json({ repaired: fixed.changed });
    } catch (err) {
        logger.error(err, `Failed to repair x01 ${id}`);
        res.status(500).json({ message: 'It could not be repaired.' });
    }
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
    const deleted = [];
    let skipped = 0;
    try {
        for (const { type, id } of items) {
            const model = SOURCES[type];
            const doc = model && db.mongoose.isValidObjectId(id) ? await model().findById(id) : null;
            if (!doc) { skipped += 1; continue; }
            const club = await db.club.findById(doc.club);
            if (!isGlobalAdmin(req.user) && !(club && canManageClub(req.user, club))) { skipped += 1; continue; }
            const ids = playersOf(type, doc).filter(playerId => db.mongoose.isValidObjectId(playerId));
            ids.forEach(playerId => playerIds.add(playerId));
            deleted.push({ type, doc: doc.toObject(), club });
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
        await notify(deleted.map(({ type, doc, club }) => itemOf(type, doc, club, players)), 'deleted', req.user);
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
        const plain = doc.toObject();
        const players = await removeWithBadges(type, doc);
        await notify([itemOf(type, plain, club, players)], 'deleted', req.user);
        logger.warn(`${req.user.email} deleted ${type} ${id} of club "${club?.name ?? doc.club}" for fair play`);
        res.json({ message: 'Deleted.' });
    } catch (err) {
        logger.error(err, `Failed to delete ${type} ${id}`);
        res.status(500).json({ message: 'It could not be deleted.' });
    }
};
