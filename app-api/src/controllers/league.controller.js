import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { cancelLeague, checkSetup, leagueView, moveMatch, moveMatchday, setResult, startLeague, startMatch } from '../utils/leagues.js';

/**
 * The leagues of the selected club: its admins set them up, start them,
 * move matchdays and matches and decide matches; its members play them.
 */

const isAdmin = (req) => req.clubRole === CLUB_ROLES.ADMIN;
const myPlayerId = async (req) => (await db.player.findOne({ user: req.user._id, clubs: req.club._id }, '_id').lean())?._id ?? null;

const fail = (res, err, what) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    logger.error(err, `Failed to ${what}`);
    return res.status(500).json({ message: `Could not ${what}.` });
};

// the league of the request in the club (drafts only for its admins), or null after answering 404
const load = async (req, res) => {
    const league = db.mongoose.isValidObjectId(req.params.id) ? await db.league.findOne({ _id: req.params.id, club: req.club._id }) : null;
    if (!league || (league.status === 'draft' && !isAdmin(req))) {
        res.status(404).json({ message: 'There is no such league.' });
        return null;
    }
    return league;
};

const answerWith = async (req, res, league, status = 200) => res.status(status).json(await leagueView(league, { playerId: await myPlayerId(req) }));

// the club's leagues, the newest first (drafts only for the admins)
export const list = async (req, res) => {
    try {
        const query = { club: req.club._id };
        if (!isAdmin(req)) query.status = { $ne: 'draft' };
        const leagues = await db.league.find(query).sort({ createdAt: -1 });
        const me = await myPlayerId(req);
        res.json({ leagues: await Promise.all(leagues.map(league => leagueView(league, { playerId: me }))) });
    } catch (err) {
        fail(res, err, 'load the leagues');
    }
};

export const findOne = async (req, res) => {
    try {
        const league = await load(req, res);
        if (league) await answerWith(req, res, league);
    } catch (err) {
        fail(res, err, 'load the league');
    }
};

export const create = async (req, res) => {
    try {
        const { setup, error } = await checkSetup(req.body, req.club._id);
        if (error) return res.status(422).json({ message: error });
        const league = await db.league.create({ ...setup, club: req.club._id, createdBy: req.user._id });
        if (req.body.start) await startLeague(league);
        await answerWith(req, res, league, 201);
    } catch (err) {
        fail(res, err, 'set up the league');
    }
};

export const update = async (req, res) => {
    try {
        const league = await load(req, res);
        if (!league) return;
        const { setup, error } = await checkSetup(req.body, req.club._id, league);
        if (error) return res.status(422).json({ message: error });
        Object.assign(league, setup);
        await league.save();
        await answerWith(req, res, league);
    } catch (err) {
        fail(res, err, 'change the league');
    }
};

export const remove = async (req, res) => {
    try {
        const league = await load(req, res);
        if (!league) return;
        if (!['draft', 'cancelled'].includes(league.status)) return res.status(409).json({ message: 'Cancel the league first.' });
        await db.league.deleteOne({ _id: league._id });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        fail(res, err, 'delete the league');
    }
};

// runs an action of the league service and answers with the league
const act = (what, action) => async (req, res) => {
    try {
        const league = await load(req, res);
        if (!league) return;
        await action(league, req);
        await answerWith(req, res, league);
    } catch (err) {
        fail(res, err, what);
    }
};

export const start = act('start the league', (league) => startLeague(league));
export const cancel = act('cancel the league', (league) => cancelLeague(league));
export const result = act('decide the match', (league, req) => setResult(league, req.params.match, req.body.winner, { by: req.user._id }));
export const moveDay = act('move the matchday', (league, req) => moveMatchday(league, Number(req.params.day), req.body.date));
export const moveOne = act('move the match', (league, req) => moveMatch(league, req.params.match, req.body.date ?? null));

// a match started as a game: its players or an admin; → { game }
export const startOne = async (req, res) => {
    try {
        const league = await load(req, res);
        if (!league) return;
        const match = league.matches.find(entry => entry.id === req.params.match);
        const me = await myPlayerId(req);
        if (match && !isAdmin(req) && !match.players.includes(String(me))) return res.status(403).json({ message: 'Only its players or an admin start a match.' });
        const game = await startMatch(league, req.params.match, { first: req.body.first ?? null });
        res.status(201).json({ game: String(game._id) });
    } catch (err) {
        fail(res, err, 'start the match');
    }
};
