import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { syncPlayerBadges } from '../utils/badge.service.js';
import { noteCreated, checkLater } from '../utils/spam.guard.js';
import { hiddenTrainingPlayers, mayDeleteTrainingOf } from '../utils/training.privacy.js';
import { RULES_TRAININGS } from '../utils/rules.kinds.js';
import { withPlayers } from './atc.controller.js';

const Training = db.rulesTraining;

/**
 * Saves a training once it is over. The answer also says whether it beat the
 * player's best in this kind and which badges it earned, so the app can celebrate.
 */
export const create = async (req, res) => {
    logger.debug('rules training create called');
    try {
        const playerId = req.body.player?.id;
        const player = db.mongoose.isValidObjectId(playerId)
            ? await db.player.findOne({ _id: playerId, clubs: req.club._id })
            : null;
        if (!player) return res.status(400).json({ message: 'The player is not a member of this club.' });

        const { kind } = req.body;
        const higher = RULES_TRAININGS[kind].higherIsBetter;
        const previousBest = await Training.findOne({ club: req.club._id, kind, 'player.id': playerId }).sort({ score: higher ? -1 : 1 }).lean();
        const data = await new Training({
            club: req.club._id,
            kind,
            settings: req.body.settings ?? {},
            darts: req.body.darts ?? [],
            score: req.body.score,
            result: req.body.result ?? {},
            player: { id: String(player._id), nickname: player.nickname },
        }).save();
        checkLater(() => noteCreated(req, 'training', { id: data._id, name: RULES_TRAININGS[kind].title, names: [] }));

        let newBadges = [];
        if (!player.guest) {
            ({ newBadges } = await syncPlayerBadges(player).catch(err => {
                logger.error(err, 'Failed to update badges after a training');
                return { newBadges: [] };
            }));
        }
        const better = previousBest && (higher ? data.score > previousBest.score : data.score < previousBest.score);
        res.status(201).json({
            ...(await withPlayers([data.toJSON()]))[0],
            isRecord: Boolean(better),
            previousBest: previousBest?.score ?? null,
            newBadges,
        });
    } catch (err) {
        logger.error(err, 'Failed to create a training');
        res.status(500).json({ message: 'The training could not be saved.' });
    }
};

/**
 * The trainings of the club, of one kind (?kind=bobs27), newest first. The
 * trainings of players who keep them to themselves stay out.
 */
export const findByQuery = async (req, res) => {
    try {
        const condition = { club: req.club._id };
        if (req.query.kind) condition.kind = String(req.query.kind);
        const hidden = await hiddenTrainingPlayers(req);
        if (hidden.length) condition['player.id'] = { $nin: hidden };
        const data = await Training.find(condition).sort({ createdAt: -1 }).limit(1000);
        res.json(await withPlayers(data.map(entry => entry.toJSON())));
    } catch (err) {
        logger.error(err, 'Failed to load trainings');
        res.status(500).json({ message: 'The trainings could not be loaded.' });
    }
};

export const del = async (req, res) => {
    const { id } = req.params;
    try {
        const entry = db.mongoose.isValidObjectId(id) ? await Training.findOne({ _id: id, club: req.club._id }) : null;
        if (!entry) return res.status(404).json({ message: 'Training not found.' });
        if (!(await mayDeleteTrainingOf(req, entry.player?.id))) return res.status(403).json({ message: 'Only the player or a club admin can delete a training.' });
        await entry.deleteOne();
        const player = db.mongoose.isValidObjectId(entry.player?.id) ? await db.player.findById(entry.player.id) : null;
        if (player) {
            player.badges = player.badges.filter(badge => badge.sourceId !== String(entry._id));
            await player.save();
            await syncPlayerBadges(player);
        }
        res.json({ message: 'Training deleted.' });
    } catch (err) {
        logger.error(err, `Failed to delete training id=${id}`);
        res.status(500).json({ message: 'The training could not be deleted.' });
    }
};
