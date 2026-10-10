import logger from '../models/logger.model.js';
import { createGameFilterQuery } from '../utils/game.utils.js';

const DEFAULT_LIMIT = 100;

/**
 * Factory that generates standard CRUD handlers for a game model.
 */
export const createGameController = (Model, gameName) => {
    const label = gameName;

    const create = async (req, res) => {
        logger.debug(`Create ${label} game called`);
        try {
            const doc = new Model(req.body);
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
            const query = createGameFilterQuery(req.body);
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
            const data = await Model.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
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
            const data = await Model.findById(id);
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
            // Use $set explicitly to prevent MongoDB operator injection from req.body
            const data = await Model.findByIdAndUpdate(id, { $set: req.body }, { new: true });
            if (!data) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
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
            const data = await Model.findByIdAndDelete(id);
            if (!data) return res.status(404).json({ message: `${label} game not found (id=${id}).` });
            res.json({ message: `${label} game deleted successfully.` });
        } catch (err) {
            logger.error(err, `Failed to delete ${label} game id=${id}`);
            res.status(500).json({ message: `Error deleting ${label} game (id=${id}).` });
        }
    };

    return { create, findByFilters, findAll, findOne, update, delete: del };
};
