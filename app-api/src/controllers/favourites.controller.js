import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { favouritesOf, startFavourite } from '../utils/favourites.js';

/**
 * The favourites of the user's player in the selected club, for their
 * dashboard, and starting one again.
 */

const myPlayer = (req) => db.player.findOne({ user: req.user._id, clubs: req.club._id }, '_id').lean();

export const list = async (req, res) => {
    try {
        const player = await myPlayer(req);
        res.json(player ? await favouritesOf(req.club._id, player._id) : []);
    } catch (err) {
        logger.error(err, 'Failed to load the favourites');
        res.status(500).json({ message: 'Could not load the favourites.' });
    }
};

// → { type, kind, id, path }: the new game
export const start = async (req, res) => {
    try {
        const player = await myPlayer(req);
        if (!player) return res.status(403).json({ message: 'You do not play in this club.' });
        res.status(201).json(await startFavourite(req.club, player._id, req.params.id));
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        logger.error(err, 'Failed to start a favourite');
        res.status(500).json({ message: 'Could not start the game.' });
    }
};
