import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { syncPlayerBadges } from '../utils/badge.service.js';
import { noteCreated, checkLater } from '../utils/spam.guard.js';

const ATC = db.atc;

// entries from before the fewest-darts trainings have no scoring: they are against the clock
const scoringFilter = (scoring) => scoring === 'Darts' ? { scoring: 'Darts' } : { scoring: { $ne: 'Darts' } };
// lower is better in both
const scoreField = (scoring) => scoring === 'Darts' ? 'darts' : 'timeMs';

const PLAYER_FIELDS = 'nickname firstname lastname profileImg guest';

/**
 * The entries with their players as they are now. A deleted player keeps the
 * nickname the entry was saved with.
 */
export const withPlayers = async (entries) => {
    const ids = [...new Set(entries.map(entry => entry.player?.id).filter(id => db.mongoose.isValidObjectId(id)))];
    const players = new Map((await db.player.find({ _id: { $in: ids } }, PLAYER_FIELDS).lean())
        .map(({ _id, ...player }) => [String(_id), { id: String(_id), ...player }]));
    return entries.map(entry => ({
        ...entry,
        player: players.get(entry.player?.id) ?? (entry.player?.id ? { id: entry.player.id, nickname: entry.player.nickname } : null),
    }));
};

/**
 * Saves a training. The answer also says whether it beat the player's best
 * time in this mode and which badges it earned, so the UI can celebrate.
 */
export const create = async (req, res) => {
    logger.debug('ATC create called');
    try {
        const playerId = req.body.player?.id;
        const player = db.mongoose.isValidObjectId(playerId)
            ? await db.player.findOne({ _id: playerId, clubs: req.club._id })
            : null;
        if (!player) return res.status(400).json({ message: 'The player is not a member of this club.' });

        const scoring = req.body.scoring === 'Darts' ? 'Darts' : 'Time';
        const field = scoreField(scoring);
        const previousBest = await ATC.findOne({ club: req.club._id, mode: req.body.mode, 'player.id': playerId, ...scoringFilter(scoring) }).sort({ [field]: 1 }).lean();

        // the player by id, with the nickname for when the player is deleted later
        const atc = new ATC({
            club: req.club._id,
            mode: req.body.mode,
            scoring,
            ...(scoring === 'Darts'
                ? { darts: req.body.darts, dartsPerTarget: req.body.dartsPerTarget }
                : { timeMs: req.body.timeMs }),
            ...(req.body.session && { session: req.body.session }),
            player: { id: String(player._id), nickname: player.nickname },
        });
        const data = await atc.save();
        checkLater(() => noteCreated(req, 'training', { id: data._id, name: 'Around the Clock', names: [] }));

        let newBadges = [];
        if (!player.guest) {
            ({ newBadges } = await syncPlayerBadges(player).catch(err => {
                logger.error(err, 'Failed to update badges after a training');
                return { newBadges: [] };
            }));
        }

        res.status(201).json({
            ...(await withPlayers([data.toJSON()]))[0],
            isRecord: Boolean(previousBest) && data[field] < previousBest[field],
            previousBest: previousBest?.[field] ?? null,
            newBadges,
        });
    } catch (err) {
        logger.error(err, 'Failed to create ATC entry');
        res.status(500).json({ message: err.message || 'Error creating ATC entry.' });
    }
};

export const findByQuery = async (req, res) => {
    logger.debug('ATC findByQuery called');
    try {
        const condition = req.query.mode
            ? { mode: { $regex: new RegExp(req.query.mode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }
            : {};
        condition.club = req.club._id;
        if (req.query.scoring) Object.assign(condition, scoringFilter(req.query.scoring));
        const data = await ATC.find(condition);
        res.json(await withPlayers(data.map(entry => entry.toJSON())));
    } catch (err) {
        logger.error(err, 'Failed to retrieve ATC entries');
        res.status(500).json({ message: err.message || 'Error retrieving ATC entries.' });
    }
};

export const del = async (req, res) => {
    logger.debug('ATC delete called');
    const { id } = req.params;
    try {
        const data = db.mongoose.isValidObjectId(id) ? await ATC.findOneAndDelete({ _id: id, club: req.club._id }) : null;
        if (!data) return res.status(404).json({ message: `ATC entry not found (id=${id}).` });
        res.json({ message: 'ATC entry deleted successfully.' });
    } catch (err) {
        logger.error(err, `Failed to delete ATC entry id=${id}`);
        res.status(500).json({ message: `Error deleting ATC entry (id=${id}).` });
    }
};
