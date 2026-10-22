import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { gameModelOf, removeWithBadges } from '../utils/badge.service.js';
import { deletionNotices, tally } from '../utils/deletion.requests.js';
import { describe } from './integrity.controller.js';

const nameOf = (user) => `${user.firstname} ${user.lastname}`;
const actorOf = (user) => ({ id: String(user._id), name: nameOf(user) });

const view = (request, req) => {
    const me = String(req.user._id);
    return {
        id: String(request._id),
        type: request.type,
        game: request.game,
        summary: request.summary ?? '',
        playedAt: request.playedAt ?? null,
        byName: request.byName ?? '',
        mine: String(request.by) === me,
        reason: request.reason ?? '',
        players: (request.players ?? []).map(player => ({
            player: player.player,
            nickname: player.nickname ?? '',
            hasLogin: Boolean(player.user),
            // the user answers for their own players
            mine: Boolean(player.user) && String(player.user) === me,
            answer: player.answer ?? null,
        })),
        ...tally(request),
        status: request.status,
        note: request.note ?? '',
        decidedByName: request.decidedByName ?? '',
        decidedAt: request.decidedAt ?? null,
        at: request.createdAt,
    };
};

// tells who should know; a failure only costs the notifications
const notify = async (event, request, req, auto = false) => {
    try {
        const notices = deletionNotices(event, request, { actor: actorOf(req.user), clubName: req.club.name, admins: req.club.admins, auto });
        if (notices.length) await db.notification.insertMany(notices);
    } catch (err) {
        logger.error(err, 'Failed to send the notifications of a deletion request');
    }
};

// the game of a request, in the request's club, or null when it is gone already
const gameOf = async (request) => {
    const model = gameModelOf(request.type);
    if (!model || !db.mongoose.isValidObjectId(request.game)) return null;
    return model().findOne({ _id: request.game, club: request.club });
};

// deletes the game and closes the request
const deleteGame = async (request, req, auto) => {
    const game = await gameOf(request);
    if (game) await removeWithBadges(request.type, game);
    request.status = 'deleted';
    request.decidedBy = req.user._id;
    request.decidedByName = auto ? '' : nameOf(req.user);
    request.decidedAt = new Date();
    await request.save();
    await notify('deleted', request, req, auto);
    logger.warn(`${req.user.email} deleted ${request.type} ${request.game} of club "${req.club.name}" on request${auto ? ' (every player agreed)' : ''}`);
};

// the request in the club of the request, or a response sent
const loadRequest = async (req, res) => {
    const request = db.mongoose.isValidObjectId(req.params.id)
        ? await db.deletionRequest.findOne({ _id: req.params.id, club: req.club._id })
        : null;
    if (!request) res.status(404).json({ message: 'The request was not found.' });
    return request;
};

/**
 * The open requests of the club, for the games list.
 */
export const findOpen = async (req, res) => {
    try {
        const requests = await db.deletionRequest.find({ club: req.club._id, status: 'open' }).sort({ createdAt: -1 });
        res.json(requests.map(request => view(request, req)));
    } catch (err) {
        logger.error(err, 'Failed to load the deletion requests');
        res.status(500).json({ message: 'The requests could not be loaded.' });
    }
};

/**
 * One request, open or closed, e.g. from a notification.
 */
export const findOne = async (req, res) => {
    const request = await loadRequest(req, res);
    if (request) res.json(view(request, req));
};

/**
 * A player asks to delete a game they played: { type, game, reason }. Their
 * own players agree with asking; when that is every player, the game goes
 * at once, otherwise the other players and the club admins are asked.
 */
export const create = async (req, res) => {
    const { type, game: gameId, reason = '' } = req.body;
    try {
        const model = gameModelOf(type);
        const game = model ? await model().findOne({ _id: gameId, club: req.club._id }) : null;
        if (!game) return res.status(404).json({ message: 'The game was not found.' });
        const ids = (game.players ?? []).map(String);
        const players = await db.player.find({ _id: { $in: ids.filter(id => db.mongoose.isValidObjectId(id)) } }, 'nickname user').lean();
        const byId = new Map(players.map(player => [String(player._id), player]));
        const me = String(req.user._id);
        if (!players.some(player => String(player.user) === me)) {
            return res.status(403).json({ message: 'Only the players of a game can ask to delete it.' });
        }
        if (await db.deletionRequest.exists({ game: String(game._id), status: 'open' })) {
            return res.status(409).json({ message: 'Deleting this game was asked for already.' });
        }
        const request = await db.deletionRequest.create({
            club: req.club._id,
            type,
            game: String(game._id),
            summary: describe(type, game.toObject()),
            playedAt: game.updatedAt,
            by: req.user._id,
            byName: nameOf(req.user),
            reason: String(reason).trim(),
            players: ids.map(id => {
                const player = byId.get(id);
                const user = player?.user ?? null;
                const mine = user && String(user) === me;
                return { player: id, nickname: player?.nickname ?? '', user, answer: mine ? 'agreed' : null, at: mine ? new Date() : undefined };
            }),
        });
        if (tally(request).everyoneAgreed) await deleteGame(request, req, true);
        else await notify('requested', request, req);
        res.status(201).json(view(request, req));
    } catch (err) {
        logger.error(err, `Failed to ask for deleting ${type} ${gameId}`);
        res.status(500).json({ message: 'The request could not be sent.' });
    }
};

/**
 * A player of the game answers for their players: { agree }. With the last
 * one agreeing, and every player with a login, the game is deleted.
 */
export const answer = async (req, res) => {
    const request = await loadRequest(req, res);
    if (!request) return;
    if (request.status !== 'open') return res.status(409).json({ message: 'This request is closed already.' });
    const me = String(req.user._id);
    const own = request.players.filter(player => player.user && String(player.user) === me);
    if (!own.length) return res.status(403).json({ message: 'Only the players of the game can answer.' });
    try {
        own.forEach(player => {
            player.answer = req.body.agree ? 'agreed' : 'declined';
            player.at = new Date();
        });
        await request.save();
        if (tally(request).everyoneAgreed) await deleteGame(request, req, true);
        res.json(view(request, req));
    } catch (err) {
        logger.error(err, `Failed to answer the deletion request ${request._id}`);
        res.status(500).json({ message: 'The answer could not be saved.' });
    }
};

/**
 * A club admin decides: { delete, note }. Deleting takes the badges earned
 * in the game along; keeping closes the request.
 */
export const decide = async (req, res) => {
    const request = await loadRequest(req, res);
    if (!request) return;
    if (req.clubRole !== CLUB_ROLES.ADMIN) return res.status(403).json({ message: 'Only club admins decide.' });
    if (request.status !== 'open') return res.status(409).json({ message: 'This request is closed already.' });
    try {
        request.note = String(req.body.note ?? '').trim();
        if (req.body.delete) {
            await deleteGame(request, req, false);
        } else {
            request.status = 'kept';
            request.decidedBy = req.user._id;
            request.decidedByName = nameOf(req.user);
            request.decidedAt = new Date();
            await request.save();
            await notify('kept', request, req);
        }
        res.json(view(request, req));
    } catch (err) {
        logger.error(err, `Failed to decide the deletion request ${request._id}`);
        res.status(500).json({ message: 'The decision could not be saved.' });
    }
};

/**
 * The one who asked takes the request back; the notifications asking the
 * others go along.
 */
export const withdraw = async (req, res) => {
    const request = await loadRequest(req, res);
    if (!request) return;
    if (String(request.by) !== String(req.user._id)) return res.status(403).json({ message: 'Only the one who asked can take it back.' });
    if (request.status !== 'open') return res.status(409).json({ message: 'This request is closed already.' });
    try {
        request.status = 'withdrawn';
        request.decidedAt = new Date();
        await request.save();
        await db.notification.deleteMany({ kind: 'deletionRequested', link: `/games?deletion=${request._id}` });
        res.json(view(request, req));
    } catch (err) {
        logger.error(err, `Failed to withdraw the deletion request ${request._id}`);
        res.status(500).json({ message: 'The request could not be taken back.' });
    }
};
