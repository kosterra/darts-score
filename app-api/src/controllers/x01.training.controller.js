import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';

// the bot is no player of the club: it only lives in its trainings
export const BOT_ID = 'bot';
const Training = db.x01Training;

const humanOf = (players = []) => players.find(id => id !== BOT_ID);

// the player of a training, if it is in the club: player or a response sent. Like
// games, anyone of the club may start one for any of its players (e.g. a child on
// a parent's phone)
const loadPlayer = async (req, res, playerId) => {
    if (!db.mongoose.isValidObjectId(playerId)) {
        res.status(422).json({ errors: ['Choose a player of the club.'] });
        return null;
    }
    const player = await db.player.findOne({ _id: playerId, clubs: req.club._id });
    if (!player) {
        res.status(422).json({ errors: ['Choose a player of the club.'] });
        return null;
    }
    return player;
};

// how strong the bot plays, as the app worked it out from the player's statistics
const botOf = (bot = {}) => ({
    average: Math.min(130, Math.max(5, Number(bot.average) || 30)),
    checkoutRate: bot.checkoutRate == null ? null : Math.min(1, Math.max(0, Number(bot.checkoutRate) || 0)),
    basis: String(bot.basis ?? '').slice(0, 200),
});

const validPlayers = (players) => Array.isArray(players) && players.length === 2 && players.includes(BOT_ID) && humanOf(players);

/**
 * Starts an X01 training against the bot: the game of the X01 setup with the
 * players [player, 'bot'] (in either order) and the bot's strength.
 */
export const create = async (req, res) => {
    if (!validPlayers(req.body.players)) return res.status(422).json({ errors: ['A training is one player against the bot.'] });
    const player = await loadPlayer(req, res, humanOf(req.body.players));
    if (!player) return;
    try {
        const training = await Training.create({ ...req.body, club: req.club._id, bot: botOf(req.body.bot) });
        logger.info(`${req.user.email} started an X01 training against the bot as "${player.nickname}"`);
        res.status(201).json(training);
    } catch (err) {
        logger.error(err, 'Failed to start an X01 training');
        res.status(500).json({ message: 'The training could not be started.' });
    }
};

export const findOne = async (req, res) => {
    if (!db.mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
    const training = await Training.findOne({ _id: req.params.id, club: req.club._id });
    if (!training) return res.status(404).json({ message: 'Not found.' });
    res.json(training);
};

// after every visit, like a game; only within the club, and the players and the bot stay.
// Like the games it is a plain update: the app sends back the whole training, with
// fields of the database (version, timestamps) that must not be written back
export const update = async (req, res) => {
    if (!db.mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
    const training = await Training.findOne({ _id: req.params.id, club: req.club._id }, 'players');
    if (!training) return res.status(404).json({ message: 'Not found.' });
    if (!(await loadPlayer(req, res, humanOf(training.players)))) return;
    // eslint-disable-next-line no-unused-vars
    const { players, bot, club, _id, id, __v, createdAt, updatedAt, ...changes } = req.body;
    try {
        const saved = await Training.findOneAndUpdate({ _id: training._id }, { $set: changes }, { returnDocument: 'after' });
        res.json(saved);
    } catch (err) {
        logger.error(err, `Failed to save the X01 training ${req.params.id}`);
        res.status(500).json({ message: 'The training could not be saved.' });
    }
};

/**
 * The trainings of a player in the club, newest first: ?player=id
 */
export const findByPlayer = async (req, res) => {
    const playerId = String(req.query.player ?? '');
    if (!db.mongoose.isValidObjectId(playerId)) return res.json([]);
    const trainings = await Training.find({ club: req.club._id, players: playerId }).sort({ createdAt: -1 }).limit(50);
    res.json(trainings);
};

export const remove = async (req, res) => {
    if (!db.mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
    const training = await Training.findOne({ _id: req.params.id, club: req.club._id });
    if (!training) return res.status(404).json({ message: 'Not found.' });
    const player = await loadPlayer(req, res, humanOf(training.players));
    if (!player) return;
    // deleting is for the player themselves and the club admins
    if (req.clubRole !== CLUB_ROLES.ADMIN && !(player.user && player.user.equals(req.user._id))) {
        return res.status(403).json({ message: 'Only the player or a club admin can delete a training.' });
    }
    await training.deleteOne();
    res.json({ message: 'Deleted.' });
};
