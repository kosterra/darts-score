import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

const ATC = db.atc;

export const create = async (req, res) => {
    logger.debug('ATC create called');
    try {
        const atc = new ATC(req.body);
        const data = await atc.save();
        res.status(201).json(data);
    } catch (err) {
        logger.error(err, 'Failed to create ATC entry');
        res.status(500).json({ message: err.message || 'Error creating ATC entry.' });
    }
};

export const findByQuery = async (req, res) => {
    logger.debug('ATC findByQuery called');
    try {
        const condition = req.query.mode
            ? { mode: { $regex: new RegExp(req.query.mode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }
            : {};
        const data = await ATC.find(condition);
        res.json(data);
    } catch (err) {
        logger.error(err, 'Failed to retrieve ATC entries');
        res.status(500).json({ message: err.message || 'Error retrieving ATC entries.' });
    }
};

export const del = async (req, res) => {
    logger.debug('ATC delete called');
    const { id } = req.params;
    try {
        const data = await ATC.findByIdAndDelete(id);
        if (!data) return res.status(404).json({ message: `ATC entry not found (id=${id}).` });
        res.json({ message: 'ATC entry deleted successfully.' });
    } catch (err) {
        logger.error(err, `Failed to delete ATC entry id=${id}`);
        res.status(500).json({ message: `Error deleting ATC entry (id=${id}).` });
    }
};
