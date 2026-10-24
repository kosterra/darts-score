import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { validatePlayerIds } from '../validators/game.validators.js';
import { getPlayerStats } from '../controllers/player.stats.controller.js';
import { getX01Stats } from '../controllers/x01.stats.controller.js';
import { getPlayersX01Stats } from '../controllers/players.x01.stats.controller.js';
import { getHeadToHead } from '../controllers/head.to.head.controller.js';
import { getDuel, getOpponents, getSideBySide } from '../controllers/compare.controller.js';
import { getClubStats, getGamesOverview, getPlayerGames, getPlayerLevels, getPlayersForm } from '../controllers/club.stats.controller.js';
import { getClubBadges, getClubOwnBadges, getClubShame, getPlayerBadges, getGameBadges } from '../controllers/badge.controller.js';
import { playersKnownInClub } from '../controllers/game.controller.js';
import db from '../models/db.model.js';

// Statistics are only given for players and games of the request's club,
// also for former members, whose games stay in the club
const playerInClub = async (req, res, next) => {
    if (!(await playersKnownInClub([req.params.id], req.club._id))) {
        return res.status(404).json({ message: 'Player not found.' });
    }
    next();
};

const playersInClub = async (req, res, next) => {
    if (!(await playersKnownInClub(req.body.playerIds, req.club._id))) {
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

    // Club dashboard: club facts, leaderboards and recent games
    router.get('/club', getClubStats);
    router.get('/games', getGamesOverview);
    router.get('/levels', getPlayerLevels);
    // Badges of a player, and the badges earned in one game
    router.get('/badges', getClubBadges);
    router.get('/shame', getClubShame);
    router.get('/club-badges', getClubOwnBadges);
    router.get('/badges/player/:id', playerInClub, getPlayerBadges);
    router.get('/badges/game/:type/:id', getGameBadges);
    // Retrieve stats for a player
    router.get('/player/:id', playerInClub, getPlayerStats);
    router.get('/player/:id/games', playerInClub, getPlayerGames);
    // Retrieve stats for a x01 game
    router.get('/games/x01/:id', x01GameInClub, getX01Stats);
    // Retrieve X01 stats for multiple players
    router.post('/players/x01', validatePlayerIds, validate, playersInClub, getPlayersX01Stats);
    router.post('/players/headtohead', validatePlayerIds, validate, playersInClub, getHeadToHead);
    // the player comparison: the duel in any game, each player side by side, and who someone plays most
    router.post('/compare/duel', validatePlayerIds, validate, playersInClub, getDuel);
    router.post('/compare/side', validatePlayerIds, validate, playersInClub, getSideBySide);
    router.get('/compare/opponents/:id', playerInClub, getOpponents);
    // the current form of compared players, from their own latest games
    router.post('/players/form', validatePlayerIds, validate, playersInClub, getPlayersForm);

    app.use('/api/stats', router);
};
