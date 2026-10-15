import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { createGameFilterQuery } from '../utils/game.utils.js';
import { syncGameBadges } from '../utils/badge.service.js';

const DEFAULT_LIMIT = 100;

/**
 * True when every given player id belongs to the club.
 */
export const playersBelongToClub = async (playerIds, clubId) => {
    const ids = [...new Set(playerIds)];
    if (!ids.every(id => db.mongoose.isValidObjectId(id))) return false;
    return await db.player.countDocuments({ _id: { $in: ids }, club: clubId }) === ids.length;
};

/**
 * Factory that generates standard CRUD handlers for a game model.
 */
export const createGameController = (Model, gameName) => {
    const label = gameName;

    // Games are only ever read and changed within the request's club
    const inClub = (req) => ({ _id: req.params.id, club: req.club._id });
    const validId = (req) => db.mongoose.isValidObjectId(req.params.id);

    const create = async (req, res) => {
        logger.debug(`Create ${label} game called`);
        try {
            if (!(await playersBelongToClub(req.body.players, req.club._id))) {
                return res.status(422).json({ errors: ['All players must belong to the selected club.'] });
            }
            const doc = new Model({ ...req.body, club: req.club._id });
            const data = await doc.save();
            res.status(201).json(data);
        } catch (err) {
            logger.error(err, `Failed to create ${label} game`);
            res.status(500).json({ message: err.message || `Error creating ${label} game.` });
        }
    };

    const findByFilters = async (req, res) => {
        logger.debug(`${label} findByFilters called`);
        try {
            const query = { ...createGameFilterQuery(req.body), club: req.club._id };
            const data = await Model.find(query);
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
            res.json(data);
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
            const changes = { ...req.body, club: req.club._id };
            const data = validId(req) ? await Model.findOneAndUpdate(inClub(req), { $set: changes }, { new: true }) : null;
            if (!data) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
            // A finished game may have earned its players new badges
            if (data.hasWinner) await syncGameBadges(req.club._id, data);
            res.json(data);
        } catch (err) {
            logger.error(err, `Failed to update ${label} game id=${id}`);
            res.status(500).json({ message: `Error updating ${label} game (id=${id}).` });
        }
    };

    const del = async (req, res) => {
        logger.debug(`${label} delete called`);
        const { id } = req.params;
        try {
            const data = validId(req) ? await Model.findOneAndDelete(inClub(req)) : null;
            if (!data) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
            res.json({ message: `${label} game deleted successfully.` });
        } catch (err) {
            logger.error(err, `Failed to delete ${label} game id=${id}`);
            res.status(500).json({ message: `Error deleting ${label} game (id=${id}).` });
        }
    };

    return { create, findByFilters, findAll, findOne, update, delete: del };
};
