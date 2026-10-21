import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { x01StatsOf } from './x01.stats.controller.js';
import { hashKey, keyMatches, newKey, quickGameError, quickGameView, winnerOf } from '../utils/quick.games.js';

const QuickGame = db.quickGame;

// the game as the page sends it, without what the server keeps itself
const SERVER_FIELDS = ['id', '_id', 'quick', 'kind', 'createdAt', 'updatedAt'];
const gameOf = (body) => Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => !SERVER_FIELDS.includes(key)));

// the key of the browser that started the game
const keyOf = (req) => req.get('x-quick-key') ?? '';

const fields = (game) => ({
    data: game,
    names: game.quickPlayers.map(player => player.nickname.trim()),
    winner: winnerOf(game),
    gameIsRunning: game.gameIsRunning !== false,
    hasWinner: Boolean(game.hasWinner),
});

// the game, when the request carries its key; otherwise a response is sent
const loadOwn = async (req, res) => {
    const game = db.mongoose.isValidObjectId(req.params.id) ? await QuickGame.findById(req.params.id) : null;
    // an unknown game and a wrong key answer alike: nothing tells whether a game exists
    if (!game || !keyMatches(keyOf(req), game.keyHash)) {
        res.status(404).json({ message: 'This quick game was not found on this device.' });
        return null;
    }
    return game;
};

/**
 * Starts a quick game: { kind, game } → { game, key }. The key comes back once;
 * the browser keeps it to play on and to see the statistics.
 */
export const create = async (req, res) => {
    const { kind } = req.body ?? {};
    const game = req.body?.game && typeof req.body.game === 'object' ? gameOf(req.body.game) : null;
    const error = quickGameError(kind, game);
    if (error) return res.status(422).json({ errors: [error] });
    const key = newKey();
    const created = await QuickGame.create({ kind, keyHash: hashKey(key), ...fields(game) });
    logger.info(`Quick ${kind} game started with ${created.names.length} players`);
    res.status(201).json({ game: quickGameView(created), key });
};

export const findOne = async (req, res) => {
    const game = await loadOwn(req, res);
    if (game) res.json(quickGameView(game));
};

/**
 * The statistics of a quick X01 game, as a club game has them: the averages
 * per leg, the doubles, the score ranges and the sections hit.
 */
export const stats = async (req, res) => {
    const game = await loadOwn(req, res);
    if (!game) return;
    if (game.kind !== 'x01') return res.status(404).json({ message: 'Only X01 games have these statistics.' });
    res.json(x01StatsOf({ ...game.data, _id: game._id }));
};

/**
 * Saves the game after a visit or an undo; the setup and the players stay as they were.
 */
export const update = async (req, res) => {
    const game = await loadOwn(req, res);
    if (!game) return;
    const data = gameOf(req.body);
    const error = quickGameError(game.kind, data, game.data);
    if (error) return res.status(422).json({ errors: [error] });
    Object.assign(game, fields(data));
    game.markModified('data');
    await game.save();
    res.json(quickGameView(game));
};

/**
 * For the global admins: the quick games, newest first (?limit, at most 500),
 * with the counts per day of the last 30 days.
 */
export const list = async (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const [games, total, perDay] = await Promise.all([
        QuickGame.find({}, 'kind names winner gameIsRunning hasWinner createdAt updatedAt data.startingScore data.legOutMode data.numberOfLegs data.variant')
            .sort({ createdAt: -1 }).limit(limit).lean(),
        QuickGame.countDocuments(),
        QuickGame.aggregate([
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, games: { $sum: 1 }, finished: { $sum: { $cond: ['$hasWinner', 1, 0] } } } },
            { $sort: { _id: -1 } },
            { $limit: 30 },
        ]),
    ]);
    res.json({
        total,
        perDay: perDay.map(day => ({ day: day._id, games: day.games, finished: day.finished })),
        games: games.map(game => ({
            id: String(game._id),
            kind: game.kind,
            format: game.kind === 'x01'
                ? `${game.data?.startingScore} · ${game.data?.legOutMode} · best of ${game.data?.numberOfLegs} ${game.data?.numberOfLegs === 1 ? 'leg' : 'legs'}`
                : game.data?.variant ?? 'Standard',
            names: game.names,
            winner: game.winner,
            finished: game.hasWinner,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
        })),
    });
};

/**
 * For the global admins: deletes quick games, { ids }.
 */
export const remove = async (req, res) => {
    const ids = (req.body?.ids ?? []).filter(id => db.mongoose.isValidObjectId(id));
    const { deletedCount } = await QuickGame.deleteMany({ _id: { $in: ids } });
    logger.info(`${deletedCount} quick games deleted by ${req.user.email}`);
    res.json({ deleted: deletedCount });
};
