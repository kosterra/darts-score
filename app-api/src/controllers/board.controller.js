import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { changeEntry, loadNight, myBoards, nightView, saveNight, startEntry } from '../utils/boards.js';
import { screenToken, sendToPairing } from '../utils/screens.js';

/**
 * A club night of the selected club played on boards (see utils/boards.js):
 * its admins run the boards, the players of a pairing start their game,
 * everyone in the club follows the boards and the queue. And the boards of
 * the user asking, in any of their clubs.
 */

const isAdmin = (req) => req.clubRole === CLUB_ROLES.ADMIN;
const myPlayerId = async (req) => (await db.player.findOne({ user: req.user._id, clubs: req.club._id }, '_id').lean())?._id ?? null;

const fail = (res, err, what) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    logger.error(err, `Failed to ${what}`);
    return res.status(500).json({ message: `Could not ${what}.` });
};

const answerWith = async (req, res, night, status = 200) => res.status(status).json(await nightView(night, { playerId: await myPlayerId(req), isAdmin: isAdmin(req) }));

// the night of a day, for what only works once it is played on boards
const loadOn = async (req, res) => {
    const night = await loadNight(req.club, req.params.day);
    if (!night) res.status(404).json({ message: 'This club night is not played on boards.' });
    return night;
};

// the night on boards, or null when it is not played on boards (yet)
export const show = async (req, res) => {
    try {
        await answerWith(req, res, await loadNight(req.club, req.params.day));
    } catch (err) {
        fail(res, err, 'load the boards');
    }
};

// an admin sets up the boards of the night or changes them
export const save = async (req, res) => {
    try {
        const night = await saveNight(req.club, req.params.day, req.body, { by: req.user._id });
        await answerWith(req, res, night);
    } catch (err) {
        fail(res, err, 'save the boards');
    }
};

// an admin moves a pairing, holds it back or cancels it
export const entry = async (req, res) => {
    try {
        const night = await loadOn(req, res);
        if (!night) return;
        await changeEntry(night, req.params.entry, req.body);
        await answerWith(req, res, night);
    } catch (err) {
        fail(res, err, 'change the match');
    }
};

// a player of the pairing (or an admin) starts its game: { game: { kind, id } }
export const start = async (req, res) => {
    try {
        const night = await loadOn(req, res);
        if (!night) return;
        const { game, created } = await startEntry(req.club, night, req.params.entry, { first: req.body.first ?? null, playerId: await myPlayerId(req), isAdmin: isAdmin(req) });
        res.status(created ? 201 : 200).json({ game });
    } catch (err) {
        fail(res, err, 'start the match');
    }
};

// the big screen of the boards of the night: { token, expiresAt }
export const screenLink = async (req, res) => {
    const night = await loadOn(req, res);
    if (!night) return;
    logger.info(`${req.user.email} opened the big screen of the boards of the club night ${night.day}`);
    res.json(screenToken('nightBoards', night._id));
};

export const screenSend = async (req, res) => {
    const night = await loadOn(req, res);
    if (!night) return;
    if (!(await sendToPairing(req.body.code, 'nightBoards', night._id))) return res.status(404).json({ message: 'No TV shows this code. Check the code on the TV, or open /tv there again.' });
    res.json({ sent: true });
};

// an admin sets how many boards the club has: the default of its tournaments and club nights
export const clubBoards = async (req, res) => {
    try {
        req.club.boards = req.body.count;
        await req.club.save();
        res.json({ boards: req.club.boards });
    } catch (err) {
        fail(res, err, 'save the boards');
    }
};

// the user's matches that hold a board now, in any of their clubs
export const mine = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.json(await myBoards(req.user._id));
    } catch (err) {
        fail(res, err, 'load your boards');
    }
};
