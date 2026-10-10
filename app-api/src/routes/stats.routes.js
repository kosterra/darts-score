import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { validatePlayerIds } from '../validators/game.validators.js';
import { getPlayerStats } from '../controllers/player.stats.controller.js';
import { getX01Stats } from '../controllers/x01.stats.controller.js';
import { getPlayersX01Stats } from '../controllers/players.x01.stats.controller.js';

export default (app) => {
    const router = Router();

    // Retrieve stats for a player
    router.get('/player/:id', getPlayerStats);
    // Retrieve stats for a x01 game
    router.get('/games/x01/:id', getX01Stats);
    // Retrieve X01 stats for multiple players
    router.post('/players/x01', validatePlayerIds, validate, getPlayersX01Stats);

    app.use('/api/stats', router);
};
