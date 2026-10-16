import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { createGameFilterQuery, findFilteredGames } from '../utils/game.utils.js';
import { cricketKpis, eliminationKpis } from '../utils/kpi.data.js';

const MODELS = { cricket: () => db.cricket, elimination: () => db.elimination };

/**
 * Head to head of two or more players in Cricket or Elimination, with the
 * comparison page's filters: games together, wins and the figures of each
 * player, and the games for the timeline of winners.
 */
export const getHeadToHead = async (req, res) => {
    logger.debug('head to head called');
    const type = req.body.type;
    if (!MODELS[type]) return res.status(422).json({ errors: ['type must be cricket or elimination.'] });

    // starting score and format belong to X01 only
    const filters = { ...req.body, startingScore: undefined, format: undefined };
    const query = { ...createGameFilterQuery(filters), club: req.club._id };
    const games = await findFilteredGames(MODELS[type](), query, filters, true);
    const playerIds = req.body.playerIds;

    res.json({
        type,
        playedGames: games.length,
        players: playerIds.map(playerId => ({
            id: playerId,
            wins: games.filter(game => game.playerModels?.[playerId]?.hasWonGame === true).length,
            ...(type === 'cricket' ? cricketKpis(games, playerId) : eliminationKpis(games, playerId)),
        })),
        // what the timeline of winners needs
        games: games.map(game => ({
            id: String(game._id),
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
            players: (game.players ?? []).map(String),
            playerModels: Object.fromEntries(Object.entries(game.playerModels ?? {}).map(([id, model]) => [id, { hasWonGame: Boolean(model?.hasWonGame), score: model?.score ?? null }])),
        })),
    });
};
