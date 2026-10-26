import db from '../models/db.model.js';
import logger from '../models/logger.model.js';
import { answerOf, hasRules } from '../utils/game.view.js';
import { shirtOf } from '../utils/shirts.js';
import { readScreenToken, screenToken } from '../utils/screens.js';

/**
 * The big screen (see utils/screens.js): the link a member of the club makes
 * from a game, and the game as the screen shows it, without a login.
 */

const MODELS = { x01: db.x01 };

// a link for the big screen of a game of the request's club: { token, expiresAt }
export const link = (kind) => async (req, res) => {
    const { id } = req.params;
    if (!db.mongoose.isValidObjectId(id) || !(await MODELS[kind].exists({ _id: id, club: req.club._id }))) {
        return res.status(404).json({ message: 'This game is not in the selected club.' });
    }
    logger.info(`${req.user.email} opened a big screen for the ${kind} game ${id}`);
    res.json(screenToken(kind, id));
};

/**
 * The game of a screen link: { kind, game, players: [{ id, nickname, country, shirt }] (no pictures:
 * they need a login), club: { name, logo, accent }, expiresAt }; 404 for a link that is not valid (any more).
 */
export const show = async (req, res) => {
    const screen = readScreenToken(req.params.token);
    if (!screen) return res.status(404).json({ message: 'This big screen link is not valid any more. Open a new one from the game.', expired: true });
    const doc = await MODELS[screen.kind].findById(screen.gameId);
    if (!doc) return res.status(404).json({ message: 'This game is gone.', expired: true });
    const game = hasRules(screen.kind) ? answerOf(screen.kind, doc) : doc.toJSON();
    const [players, club] = await Promise.all([
        db.player.find({ _id: { $in: (doc.players ?? []).filter(id => db.mongoose.isValidObjectId(id)) } }, 'nickname country shirt bestLevel notifiedLevel').lean(),
        db.club.findById(doc.club, 'name logo accent').lean(),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({
        kind: screen.kind,
        game,
        players: players.map(player => ({ id: String(player._id), nickname: player.nickname, country: player.country ?? '', shirt: shirtOf(player) })),
        club: club ? { name: club.name, logo: club.logo ?? '', accent: club.accent ?? null } : null,
        expiresAt: screen.expiresAt,
    });
};
