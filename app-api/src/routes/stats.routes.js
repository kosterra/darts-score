import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { validatePlayerIds } from '../validators/game.validators.js';
import { getPlayerStats } from '../controllers/player.stats.controller.js';
import { getX01Stats } from '../controllers/x01.stats.controller.js';
import { getPlayersX01Stats } from '../controllers/players.x01.stats.controller.js';
import { playersBelongToClub } from '../controllers/game.controller.js';
import db from '../models/db.model.js';

// Statistics are only given for players and games of the request's club
const playerInClub = async (req, res, next) => {
    if (!(await playersBelongToClub([req.params.id], req.club._id))) {
        return res.status(404).json({ message: 'Player not found.' });
    }
    next();
};

const playersInClub = async (req, res, next) => {
    if (!(await playersBelongToClub(req.body.playerIds, req.club._id))) {
        return res.status(404).json({ message: 'Player not found.' });
    }
    next();
};

const x01GameInClub = async (req, res, next) => {
    const { id } = req.params;
    const found = db.mongoose.isValidObjectId(id) && await db.x01.exists({ _id: id, club: req.club._id });
    if (!found) return res.status(404).json({ message: 'X01 game not found.' });
    next();
};

export default (app) => {
    const router = Router();

    // Retrieve stats for a player
    router.get('/player/:id', playerInClub, getPlayerStats);
    // Retrieve stats for a x01 game
    router.get('/games/x01/:id', x01GameInClub, getX01Stats);
    // Retrieve X01 stats for multiple players
    router.post('/players/x01', validatePlayerIds, validate, playersInClub, getPlayersX01Stats);

    app.use('/api/stats', router);
};
