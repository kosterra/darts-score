import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { adoptEvening, eveningError, eveningGameError, eveningView, newEvening } from '../utils/evenings.js';
import { keyMatches, quickGameView, winnerOf } from '../utils/quick.games.js';
import { screenToken, sendToPairing } from '../utils/screens.js';
import { storedOf } from '../utils/game.view.js';
import { checkLater, noteQuickGame } from '../utils/spam.guard.js';
import { NO_CLUB_FOR_GLOBAL_ADMINS } from '../utils/global.admins.js';

/**
 * Darts evenings without an account (see utils/evenings.js): set up with the
 * players' names, played as quick games, shared read-only with a link, and
 * made a club by whoever wants to keep it.
 */

const keyOf = (req) => req.get('x-quick-key') ?? '';
const gamesOf = (evening) => db.quickGame.find({ evening: evening._id }).lean();

// the evening, when the request carries its key; otherwise a response is sent
const loadOwn = async (req, res) => {
    const evening = db.mongoose.isValidObjectId(req.params.id) ? await db.quickEvening.findById(req.params.id) : null;
    if (!evening || !keyMatches(keyOf(req), evening.keyHash)) {
        res.status(404).json({ message: 'This evening was not found on this device.' });
        return null;
    }
    return evening;
};

/**
 * Starts an evening: { name, names } → { evening, key }. The key comes back
 * once; the browser keeps it to play the evening's games.
 */
export const create = async (req, res) => {
    const error = eveningError(req.body ?? {});
    if (error) return res.status(422).json({ errors: [error] });
    const { fields, key } = newEvening(req.body);
    const evening = await db.quickEvening.create(fields);
    logger.info(`Darts evening started with ${evening.players.length} players`);
    checkLater(() => noteQuickGame(req, { _id: evening._id, names: evening.players.map(player => player.name) }));
    res.status(201).json({ evening: eveningView(evening, [], { owner: true }), key });
};

export const findOne = async (req, res) => {
    const evening = await loadOwn(req, res);
    if (evening) res.json(eveningView(evening, await gamesOf(evening), { owner: true }));
};

// read-only, for everyone with the link
export const shared = async (req, res) => {
    const evening = await db.quickEvening.findOne({ shareToken: String(req.params.token) });
    if (!evening) return res.status(404).json({ message: 'This evening is not there (any more).' });
    res.json(eveningView(evening, await gamesOf(evening)));
};

// ---------------------------------------------------------------------------
// The big screen of an evening: it follows the game running now, the table
// between games; only the browser that runs the evening makes its link
// ---------------------------------------------------------------------------

export const screenLink = async (req, res) => {
    const evening = await loadOwn(req, res);
    if (evening) res.json(screenToken('evening', evening._id));
};

export const screenSend = async (req, res) => {
    const evening = await loadOwn(req, res);
    if (!evening) return;
    if (!(await sendToPairing(req.body.code, 'evening', evening._id))) return res.status(404).json({ message: 'No TV shows this code. Check the code on the TV, or open /tv there again.' });
    res.json({ sent: true });
};

// what a big screen of an evening shows: the evening (its table) and the game running now, or null
export const screenOfEvening = async (eveningId) => {
    const evening = await db.quickEvening.findById(eveningId);
    if (!evening) return null;
    const games = await gamesOf(evening);
    const running = [...games].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).find(game => game.gameIsRunning && !game.hasWinner);
    return { evening: eveningView(evening, games), game: running ? quickGameView(running) : null };
};

/**
 * A game of the evening: { kind, game } → the quick game, played with the
 * evening's key.
 */
export const addGame = async (req, res) => {
    const evening = await loadOwn(req, res);
    if (!evening) return;
    if (evening.club) return res.status(409).json({ message: 'This evening is a club now: play on there.' });
    const { kind } = req.body ?? {};
    const sent = req.body?.game && typeof req.body.game === 'object' ? req.body.game : null;
    const error = eveningGameError(evening, kind, sent);
    if (error) return res.status(422).json({ errors: [error] });
    const data = storedOf(kind, sent);
    const game = await db.quickGame.create({
        kind, evening: evening._id, keyHash: evening.keyHash, data,
        names: data.quickPlayers.map(player => player.nickname.trim()), winner: winnerOf(data),
        gameIsRunning: data.gameIsRunning !== false, hasWinner: Boolean(data.hasWinner),
    });
    res.status(201).json({ game: quickGameView(game) });
};

/**
 * Makes the evening a club of the user (logged in): { name, me } → { club }.
 */
export const adopt = async (req, res) => {
    try {
        if (req.user.role === ROLES.GLOBAL_ADMIN) return res.status(403).json({ message: NO_CLUB_FOR_GLOBAL_ADMINS });
        const evening = await loadOwn(req, res);
        if (!evening) return;
        const result = await adoptEvening(evening, req.user, { name: req.body?.name, me: req.body?.me ?? null });
        logger.info(`Darts evening ${evening._id} became the club "${result.club.name}" of ${req.user.email}, ${result.games} games taken over`);
        res.status(201).json({ club: { id: String(result.club._id), name: result.club.name }, games: result.games });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        logger.error(err, 'Failed to make an evening a club');
        res.status(500).json({ message: 'The evening could not be made a club.' });
    }
};
