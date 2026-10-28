import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { CLUB_EVENING_MAX_PLAYERS, answerNight, calendarView, cancelNight, clubEvening, feedOf, feedTokenOf, feedUrlOf, rangeOf, restoreNight, saveNights } from '../utils/calendar.js';

/**
 * The calendar of the selected club: everyone sees it and says whether they
 * come to a club night; its admins set the weekly nights and cancel single
 * ones. And the feed of every user, for the calendar of the phone.
 */

const isAdmin = (req) => req.clubRole === CLUB_ROLES.ADMIN;
const myPlayerId = async (req) => (await db.player.findOne({ user: req.user._id, clubs: req.club._id }, '_id').lean())?._id ?? null;

const fail = (res, err, what) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    logger.error(err, `Failed to ${what}`);
    return res.status(500).json({ message: `Could not ${what}.` });
};

const answerWith = async (req, res, range = rangeOf(req.query)) => res.json(await calendarView(req.club, { playerId: await myPlayerId(req), isAdmin: isAdmin(req), ...range }));

export const show = async (req, res) => {
    try {
        await answerWith(req, res);
    } catch (err) {
        fail(res, err, 'load the calendar');
    }
};

export const setNights = async (req, res) => {
    try {
        await saveNights(req.club, req.body.nights);
        await answerWith(req, res);
    } catch (err) {
        fail(res, err, 'save the club nights');
    }
};

export const cancel = async (req, res) => {
    try {
        await cancelNight(req.club, req.params.day, req.body.reason);
        await answerWith(req, res);
    } catch (err) {
        fail(res, err, 'cancel the club night');
    }
};

export const restore = async (req, res) => {
    try {
        await restoreNight(req.club, req.params.day);
        await answerWith(req, res);
    } catch (err) {
        fail(res, err, 'restore the club night');
    }
};

export const attend = async (req, res) => {
    try {
        await answerNight(req.club, req.params.day, await myPlayerId(req), req.body.answer ?? null);
        await answerWith(req, res);
    } catch (err) {
        fail(res, err, 'save the answer');
    }
};

// the club evening of a night: ?from, ?to (instants), ?players=id,id
export const evening = async (req, res) => {
    try {
        const from = new Date(req.query.from);
        const to = new Date(req.query.to);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to - from > 2 * 24 * 60 * 60 * 1000) return res.status(422).json({ message: 'Choose the time of the evening.' });
        const players = String(req.query.players ?? '').split(',').filter(id => db.mongoose.isValidObjectId(id)).slice(0, CLUB_EVENING_MAX_PLAYERS);
        res.json(await clubEvening(req.club, { from, to, players }));
    } catch (err) {
        fail(res, err, 'load the club evening');
    }
};

// the address of the user's feed: { url }; renew: a new one, the old stops working
export const feedLink = async (req, res) => {
    try {
        const token = await feedTokenOf(req.user, { renew: req.method === 'POST' });
        res.json({ url: feedUrlOf(token) });
    } catch (err) {
        fail(res, err, 'make the calendar link');
    }
};

// the feed itself, without a login: the secret in the address is the key
export const feed = async (req, res) => {
    try {
        const ics = await feedOf(String(req.params.token).replace(/\.ics$/, ''));
        if (!ics) return res.status(404).json({ message: 'There is no such calendar.' });
        res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=900', 'Content-Disposition': 'inline; filename="legmate.ics"' });
        res.send(ics);
    } catch (err) {
        fail(res, err, 'make the calendar');
    }
};
