import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { CLUB_ROLES } from '../models/user.model.js';
import { MIN_PLAYERS, SHOWN_DAYS_AFTER } from '../rules/tournaments.js';
import {
    answerEntry, cancelTournament, checkSetup, closeRegistration, countEligible, holdDraw, openRegistration,
    readReplyToken, scheduleError, setResult, startMatch, tournamentView,
} from '../utils/tournaments.js';

/**
 * The tournaments of the selected club: its admins set them up, open the
 * registration, hold the draw and decide matches; its members enter and
 * play. The links of the invitations answer without logging in.
 */

const isAdmin = (req) => req.clubRole === CLUB_ROLES.ADMIN;
const myPlayerId = async (req) => (await db.player.findOne({ user: req.user._id, clubs: req.club._id }, '_id').lean())?._id ?? null;

// answers an Error of the tournament service with its status, anything else as a failure
const fail = (res, err, what) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    logger.error(err, `Failed to ${what}`);
    return res.status(500).json({ message: `Could not ${what}.` });
};

// the tournament of the request in the club (drafts only for its admins), or null after answering 404
const load = async (req, res) => {
    const tournament = db.mongoose.isValidObjectId(req.params.id) ? await db.tournament.findOne({ _id: req.params.id, club: req.club._id }) : null;
    if (!tournament || (tournament.status === 'draft' && !isAdmin(req))) {
        res.status(404).json({ message: 'There is no such tournament.' });
        return null;
    }
    return tournament;
};

const answerWith = async (req, res, tournament, status = 200) => res.status(status).json(await tournamentView(tournament, { playerId: await myPlayerId(req) }));

/**
 * The club's tournaments, the newest first, with whether a new one can be set
 * up (enough members). ?active=1: only those the dashboard shows.
 */
export const list = async (req, res) => {
    try {
        const query = { club: req.club._id };
        if (!isAdmin(req)) query.status = { $ne: 'draft' };
        if (req.query.active) {
            query.$or = [
                { status: { $in: ['registration', 'closed', 'drawn', 'running'] } },
                { status: 'finished', finishedAt: { $gt: new Date(Date.now() - SHOWN_DAYS_AFTER * 24 * 60 * 60 * 1000) } },
            ];
        }
        const [tournaments, eligible, playerId] = await Promise.all([
            db.tournament.find(query).sort({ createdAt: -1 }).limit(100),
            countEligible(req.club._id),
            myPlayerId(req),
        ]);
        res.json({
            min: MIN_PLAYERS,
            eligible,
            canCreate: isAdmin(req) && eligible >= MIN_PLAYERS,
            tournaments: await Promise.all(tournaments.map(tournament => tournamentView(tournament, { playerId }))),
        });
    } catch (err) {
        fail(res, err, 'load the tournaments');
    }
};

export const findOne = async (req, res) => {
    const tournament = await load(req, res);
    if (tournament) await answerWith(req, res, tournament);
};

/**
 * A new tournament, as a draft or (open: true) with its registration opened
 * at once.
 */
export const create = async (req, res) => {
    try {
        const eligible = await countEligible(req.club._id);
        if (eligible < MIN_PLAYERS) return res.status(409).json({ message: `A tournament needs at least ${MIN_PLAYERS} members; the club has ${eligible}.` });
        const { setup, error } = checkSetup(req.body);
        if (error) return res.status(422).json({ message: error });
        if (req.body.open) {
            const problem = scheduleError(setup);
            if (problem) return res.status(422).json({ message: problem });
        }
        const tournament = await db.tournament.create({ ...setup, club: req.club._id, createdBy: req.user._id });
        logger.info(`Tournament ${tournament._id} "${tournament.name}" set up by ${req.user.email}`);
        if (req.body.open) await openRegistration(tournament);
        await answerWith(req, res, tournament, 201);
    } catch (err) {
        fail(res, err, 'set up the tournament');
    }
};

export const update = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        if (['finished', 'cancelled'].includes(tournament.status)) return res.status(409).json({ message: 'This tournament is over.' });
        const { setup, error } = checkSetup(req.body, tournament);
        if (error) return res.status(422).json({ message: error });
        if (tournament.status !== 'draft') {
            // once open the days stay in order; the end of the registration only counts while it runs
            const problem = scheduleError(setup, tournament.status === 'registration' ? new Date() : new Date(new Date(setup.closesAt) - 1));
            if (problem) return res.status(422).json({ message: problem });
        }
        Object.assign(tournament, setup);
        await tournament.save();
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'save the tournament');
    }
};

// the registration opens: every member is invited
export const open = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        if (tournament.status !== 'draft') return res.status(409).json({ message: 'The registration is already open.' });
        const problem = scheduleError(tournament);
        if (problem) return res.status(422).json({ message: problem });
        const eligible = await countEligible(req.club._id);
        if (eligible < MIN_PLAYERS) return res.status(409).json({ message: `A tournament needs at least ${MIN_PLAYERS} members; the club has ${eligible}.` });
        await openRegistration(tournament);
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'open the registration');
    }
};

// the registration closes now, before its end
export const close = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        if (tournament.status !== 'registration') return res.status(409).json({ message: 'The registration is not open.' });
        await closeRegistration(tournament);
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'close the registration');
    }
};

// a closed registration opens again until a new end (e.g. too few players)
export const reopen = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        if (tournament.status !== 'closed') return res.status(409).json({ message: 'Only a closed registration can be extended.' });
        const closesAt = new Date(req.body.closesAt);
        const problem = scheduleError({ closesAt, rounds: tournament.rounds });
        if (problem) return res.status(422).json({ message: problem });
        tournament.closesAt = closesAt;
        tournament.status = 'registration';
        tournament.reminded = tournament.reminded.filter(key => key !== 'registration');
        await tournament.save();
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'extend the registration');
    }
};

// the member asking enters or declines
export const answerMine = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        const playerId = await myPlayerId(req);
        if (!playerId) return res.status(403).json({ message: 'You do not play in this club.' });
        await answerEntry(tournament, playerId, req.body.status);
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'save the answer');
    }
};

// an admin enters or takes out a member
export const answerFor = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        await answerEntry(tournament, req.params.playerId, req.body.status, { byAdmin: true });
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'save the entry');
    }
};

export const draw = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        await holdDraw(tournament, { seeding: req.body.seeding ?? 'seeded', by: req.user._id, groupSize: req.body.groupSize ?? null, advance: req.body.advance ?? null });
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'hold the draw');
    }
};

// a match starts as an X01 game, by one of its players or an admin: { game }
export const start = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        const match = tournament.matches.find(entry => entry.id === req.params.match);
        const playerId = await myPlayerId(req);
        if (!isAdmin(req) && !(match && playerId && match.players.includes(String(playerId)))) {
            return res.status(403).json({ message: 'Only the players of a match or a club admin can start it.' });
        }
        const game = await startMatch(tournament, req.params.match, { first: req.body.first ?? null });
        res.status(201).json({ game: String(game._id) });
    } catch (err) {
        fail(res, err, 'start the match');
    }
};

// an admin decides a match: a walkover, or a result agreed elsewhere
export const result = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        await setResult(tournament, req.params.match, req.body.winner, { by: req.user._id });
        logger.info(`Match ${req.params.match} of the tournament ${tournament._id} decided by ${req.user.email}`);
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'save the result');
    }
};

export const cancel = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        if (['finished', 'cancelled'].includes(tournament.status)) return res.status(409).json({ message: 'This tournament is over.' });
        await cancelTournament(tournament);
        logger.info(`Tournament ${tournament._id} cancelled by ${req.user.email}`);
        await answerWith(req, res, tournament);
    } catch (err) {
        fail(res, err, 'cancel the tournament');
    }
};

// a draft or a cancelled tournament goes for good
export const remove = async (req, res) => {
    try {
        const tournament = await load(req, res);
        if (!tournament) return;
        if (!['draft', 'cancelled'].includes(tournament.status)) return res.status(409).json({ message: 'Cancel the tournament first.' });
        await db.tournament.deleteOne({ _id: tournament._id });
        res.json({ message: 'Tournament deleted.' });
    } catch (err) {
        fail(res, err, 'delete the tournament');
    }
};

// ---------------------------------------------------------------------------
// The links of the invitations, without logging in
// ---------------------------------------------------------------------------

const fromToken = async (req, res) => {
    const reply = readReplyToken(req.query.token ?? req.body?.token);
    const tournament = reply && await db.tournament.findById(reply.tournament);
    const entry = tournament?.entries.find(item => String(item.player) === reply.player);
    if (!tournament || !entry || tournament.status === 'draft') {
        res.status(404).json({ message: 'This link is not valid (any more).' });
        return null;
    }
    return { tournament, entry, playerId: reply.player };
};

const replyInfo = async ({ tournament, entry, playerId }) => {
    const [club, player] = await Promise.all([
        db.club.findById(tournament.club, 'name').lean(),
        db.player.findById(playerId, 'nickname').lean(),
    ]);
    return {
        tournament: { id: String(tournament._id), name: tournament.name, status: tournament.status, closesAt: tournament.closesAt, maxPlayers: tournament.maxPlayers, entered: tournament.entries.filter(item => item.status === 'in').length },
        club: club?.name ?? '',
        nickname: player?.nickname ?? '',
        answer: entry.status,
        open: tournament.status === 'registration',
    };
};

export const replyLookup = async (req, res) => {
    const found = await fromToken(req, res);
    if (found) res.json(await replyInfo(found));
};

export const reply = async (req, res) => {
    try {
        const found = await fromToken(req, res);
        if (!found) return;
        await answerEntry(found.tournament, found.playerId, req.body.answer);
        const entry = found.tournament.entries.find(item => String(item.player) === found.playerId);
        res.json(await replyInfo({ ...found, entry }));
    } catch (err) {
        fail(res, err, 'save the answer');
    }
};
