import db from '../models/db.model.js';
import logger from '../models/logger.model.js';
import { answerOf, hasRules } from '../utils/game.view.js';
import { shirtOf } from '../utils/shirts.js';
import { screenOfEvening } from './evening.controller.js';
import { newPairing, pairingOf, readScreenToken, screenToken, sendToPairing } from '../utils/screens.js';

/**
 * The big screen (see utils/screens.js): the link a member of the club makes
 * from a game, and the game as the screen shows it, without a login.
 */

// the club games by kind; the newer games share one model ('rules', their kind inside)
const MODELS = { x01: db.x01, cricket: db.cricket, elimination: db.elimination, clock: db.clock, rules: db.rulesGame };

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
    if (screen.kind === 'evening') {
        const evening = await screenOfEvening(screen.gameId);
        if (!evening) return res.status(404).json({ message: 'This game is gone.', expired: true });
        res.set('Cache-Control', 'no-store');
        return res.json({ kind: 'evening', ...evening, club: null, expiresAt: screen.expiresAt });
    }
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

// a TV that opened /tv: its code and the secret it asks with
export const pair = async (req, res) => res.status(201).json(await newPairing());

// what a paired TV shows: { code, expiresAt, token } (token: the game's link, or null while waiting)
export const pairing = async (req, res) => {
    const found = await pairingOf(req.params.secret);
    if (!found) return res.status(404).json({ message: 'This TV is not paired any more.', expired: true });
    res.set('Cache-Control', 'no-store');
    res.json(found);
};

// sends a game of the request's club to the TV showing a code
export const send = (kind) => async (req, res) => {
    const { id } = req.params;
    if (!db.mongoose.isValidObjectId(id) || !(await MODELS[kind].exists({ _id: id, club: req.club._id }))) {
        return res.status(404).json({ message: 'This game is not in the selected club.' });
    }
    if (!(await sendToPairing(req.body.code, kind, id))) return res.status(404).json({ message: 'No TV shows this code. Check the code on the TV, or open /tv there again.' });
    logger.info(`${req.user.email} sent the ${kind} game ${id} to a TV`);
    res.json({ sent: true });
};
