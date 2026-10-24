import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { createGameFilterQuery, findFilteredGames } from '../utils/game.utils.js';
import { removeWithBadges, syncGameBadges } from '../utils/badge.service.js';
import { noteCreated, noteDeleted, noteFairPlay, checkLater } from '../utils/spam.guard.js';
import { knownInClub } from '../models/player.model.js';
import { answerOf, hasRules, storedOf } from '../utils/game.view.js';
import { GAME_SETTINGS, RULES_KINDS, ruleViolations } from '../rules/club.rules.js';
import { gameOf } from '../rules/games.js';
import { withGameState } from '../rules/engine.js';

/**
 * A game of the rules engine with its results worked out here from its visits,
 * by the app's rules: who is at the oche, whether it is over and per player
 * { score, rank, hasWonGame, darts }; what the app sent is not taken on trust.
 */
const withRulesResult = (changes) => {
    const definition = gameOf(changes.kind);
    if (!definition) return changes;
    const worked = withGameState(definition, changes);
    return { ...changes, currentPlayerTurn: worked.currentPlayerTurn, gameIsRunning: worked.gameIsRunning, hasWinner: worked.hasWinner, playerModels: worked.playerModels };
};

const DEFAULT_LIMIT = 100;

// what a game was set up with, and stays with: its settings, the handicap and whether it is friendly
const SET_UP = ['handicap', 'friendly', 'format'];
const keepSetUp = (game, stored, changes) => {
    const keys = RULES_KINDS.includes(game) ? ['settings', 'kind', ...SET_UP] : [...(GAME_SETTINGS[game] ?? []).map(setting => setting.key), ...SET_UP];
    const plain = typeof stored.toObject === 'function' ? stored.toObject() : stored;
    for (const key of keys) {
        if (key in plain) changes[key] = plain[key];
        else delete changes[key];
    }
    return changes;
};

/**
 * True when every given player id belongs to the club.
 */
export const playersBelongToClub = async (playerIds, clubId) => {
    const ids = [...new Set(playerIds)];
    if (!ids.every(id => db.mongoose.isValidObjectId(id))) return false;
    return await db.player.countDocuments({ _id: { $in: ids }, clubs: clubId }) === ids.length;
};

/**
 * True when every given player id is a member or a former member of the club:
 * the statistics of their games there stay available.
 */
export const playersKnownInClub = async (playerIds, clubId) => {
    const ids = [...new Set(playerIds)];
    if (!ids.every(id => db.mongoose.isValidObjectId(id))) return false;
    return await db.player.countDocuments({ _id: { $in: ids }, ...knownInClub(clubId) }) === ids.length;
};

/**
 * Factory that generates standard CRUD handlers for a game model. "type": the
 * game's rules (x01, cricket, …) when it is stored as visits: its results are
 * then worked out here from the visits, whatever the app sent.
 */
export const createGameController = (Model, gameName, type = null) => {
    const label = gameName;
    const toStore = (body) => (type && hasRules(type) ? storedOf(type, body) : body);
    // one game is answered with its legs and visits worked out; lists only with what is stored
    const answer = (doc) => (type && hasRules(type) ? answerOf(type, doc) : doc);

    // Games are only ever read and changed within the request's club
    const inClub = (req) => ({ _id: req.params.id, club: req.club._id });
    const validId = (req) => db.mongoose.isValidObjectId(req.params.id);

    const create = async (req, res) => {
        logger.debug(`Create ${label} game called`);
        try {
            if (!(await playersBelongToClub(req.body.players, req.club._id))) {
                return res.status(422).json({ errors: ['All players must belong to the selected club.'] });
            }
            // the club's own rules: its games, its locked settings, its handicap policy
            const problems = ruleViolations(type ?? req.body.kind, req.club.gameRules, req.body);
            if (problems.length) return res.status(422).json({ errors: problems });
            const doc = new Model(withRulesResult({ ...toStore(req.body), club: req.club._id }));
            const data = await doc.save();
            checkLater(() => noteCreated(req, 'game', { id: data._id, name: label, names: [] }));
            res.status(201).json(answer(data));
        } catch (err) {
            logger.error(err, `Failed to create ${label} game`);
            res.status(500).json({ message: err.message || `Error creating ${label} game.` });
        }
    };

    const findByFilters = async (req, res) => {
        logger.debug(`${label} findByFilters called`);
        try {
            const query = { ...createGameFilterQuery(req.body), club: req.club._id };
            const data = await findFilteredGames(Model, query, req.body);
            res.json(data);
        } catch (err) {
            logger.error(err, `Failed to filter ${label} games`);
            res.status(500).json({ message: err.message || `Error filtering ${label} games.` });
        }
    };

    const findAll = async (req, res) => {
        logger.debug(`${label} findAll called`);
        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, DEFAULT_LIMIT);
        const skip  = Math.max(parseInt(req.query.skip)  || 0, 0);
        try {
            const data = await Model.find({ club: req.club._id }).sort({ createdAt: -1 }).skip(skip).limit(limit);
            res.json(data);
        } catch (err) {
            logger.error(err, `Failed to load all ${label} games`);
            res.status(500).json({ message: err.message || `Error retrieving ${label} games.` });
        }
    };

    const findOne = async (req, res) => {
        logger.debug(`${label} findOne called`);
        const { id } = req.params;
        try {
            const data = validId(req) ? await Model.findOne(inClub(req)) : null;
            if (!data) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
            res.json(answer(data));
        } catch (err) {
            logger.error(err, `Failed to retrieve ${label} game id=${id}`);
            res.status(500).json({ message: `Error retrieving ${label} game (id=${id}).` });
        }
    };

    const update = async (req, res) => {
        logger.debug(`${label} update called`);
        const { id } = req.params;
        try {
            if (!(await playersBelongToClub(req.body.players, req.club._id))) {
                return res.status(422).json({ errors: ['All players must belong to the selected club.'] });
            }
            // Use $set explicitly to prevent MongoDB operator injection from req.body;
            // a game never moves to another club
            const stored = validId(req) ? await Model.findOne(inClub(req)) : null;
            if (!stored) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
            // a game keeps what it was set up with, also when the club's rules change meanwhile
            const changes = withRulesResult(keepSetUp(type ?? stored.kind, stored, { ...toStore(req.body), club: req.club._id }));
            const data = await Model.findOneAndUpdate(inClub(req), { $set: changes }, { new: true });
            if (!data) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
            // A finished game may have earned its players new badges
            if (data.hasWinner) {
                await syncGameBadges(req.club._id, data, type ?? data.kind);
                checkLater(() => noteFairPlay(req.club._id, type ?? 'rules', data));
            }
            res.json(answer(data));
        } catch (err) {
            logger.error(err, `Failed to update ${label} game id=${id}`);
            res.status(500).json({ message: `Error updating ${label} game (id=${id}).` });
        }
    };

    const del = async (req, res) => {
        logger.debug(`${label} delete called`);
        const { id } = req.params;
        try {
            const data = validId(req) ? await Model.findOne(inClub(req)) : null;
            if (!data) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
            // the badges earned in it go along
            await removeWithBadges(Model.modelName, data);
            checkLater(() => noteDeleted(req, 'game'));
            await db.deletionRequest.updateMany({ game: id, status: 'open' }, { status: 'deleted', decidedBy: req.user._id, decidedByName: `${req.user.firstname} ${req.user.lastname}`, decidedAt: new Date() });
            res.json({ message: `${label} game deleted successfully.` });
        } catch (err) {
            logger.error(err, `Failed to delete ${label} game id=${id}`);
            res.status(500).json({ message: `Error deleting ${label} game (id=${id}).` });
        }
    };

    return { create, findByFilters, findAll, findOne, update, delete: del };
};
