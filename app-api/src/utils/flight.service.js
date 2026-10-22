import db from '../models/db.model.js';
import { loadPlayerEvents } from './badge.service.js';
import { countBadges, replayBadges } from './badges.js';
import { LEVELS, levelInputs, playerLevel } from './levels.js';
import { MIN_X01_GAMES, flightStanding } from './flights.js';
import { isRulesGame } from './rules.kinds.js';

/**
 * Where a player stands with the flights (see flightStanding), worked out
 * from everything they finished in all their clubs: the replayed games and
 * Around the Clock trainings, their trainings against the bot, their
 * level and their X01 average. A game deleted later takes its points along.
 */
export const loadFlightStanding = async (player) => {
    const playerId = String(player._id);
    const events = await loadPlayerEvents(player);
    const { metrics } = replayBadges(events, playerId);
    const gamesOf = (type) => events.filter(event => event.type === type).map(event => event.data);
    const inputs = levelInputs({
        x01Games: gamesOf('x01'),
        cricketGames: gamesOf('cricket'),
        eliminationGames: gamesOf('elimination'),
        clockGames: gamesOf('clock'),
        rulesGames: events.filter(event => isRulesGame(event.type)).map(event => event.data),
        playerId,
        badgeCount: countBadges(player.badges),
    });
    const { level } = playerLevel(inputs);
    // the X01 average counts for the flights as for the levels: from a few games on
    const average = inputs.x01Games >= MIN_X01_GAMES ? Math.round(inputs.x01Average * 10) / 10 : null;
    const botTrainings = await db.x01Training.find({ players: playerId, hasWinner: true }, 'playerModels').lean();
    const counts = {
        ...metrics,
        botTrainings: botTrainings.length,
        botWins: botTrainings.filter(training => training.playerModels?.[playerId]?.hasWonGame === true).length,
    };
    return flightStanding({ counts, levelIndex: level.index, average, unlocked: player.flights?.unlocked ?? [], levels: LEVELS });
};
