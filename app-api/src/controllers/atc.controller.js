import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { syncPlayerBadges } from '../utils/badge.service.js';

const ATC = db.atc;

/**
 * Saves a training. The answer also says whether it beat the player's best
 * time in this mode and which badges it earned, so the UI can celebrate.
 */
export const create = async (req, res) => {
    logger.debug('ATC create called');
    try {
        const playerId = req.body.player?.id;
        const player = db.mongoose.isValidObjectId(playerId)
            ? await db.player.findOne({ _id: playerId, club: req.club._id })
            : null;

        const previousBest = player
            ? await ATC.findOne({ club: req.club._id, mode: req.body.mode, 'player.id': playerId }).sort({ timeMs: 1 }).lean()
            : null;

        const atc = new ATC({ ...req.body, club: req.club._id });
        const data = await atc.save();

        let newBadges = [];
        if (player && !player.guest) {
            ({ newBadges } = await syncPlayerBadges(player).catch(err => {
                logger.error(err, 'Failed to update badges after a training');
                return { newBadges: [] };
            }));
        }

        res.status(201).json({
            ...data.toJSON(),
            isRecord: Boolean(previousBest) && data.timeMs < previousBest.timeMs,
            previousBestMs: previousBest?.timeMs ?? null,
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
        const data = await ATC.find(condition);
        res.json(data);
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
