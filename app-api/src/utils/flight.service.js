import db from '../models/db.model.js';
import { loadPlayerEvents } from './badge.service.js';
import { countBadges, replayBadges } from './badges.js';
import { LEVELS, levelInputs, playerLevel } from './levels.js';
import { flightStanding } from './flights.js';

/**
 * Where a player stands with the flights (see flightStanding), worked out
 * from everything they finished in all their clubs: the replayed games and
 * Around the Clock trainings, their trainings against the bot and their
 * level. A game deleted later takes its points along.
 */
export const loadFlightStanding = async (player) => {
    const playerId = String(player._id);
    const events = await loadPlayerEvents(player);
    const { metrics } = replayBadges(events, playerId);
    const gamesOf = (type) => events.filter(event => event.type === type).map(event => event.data);
    const { level } = playerLevel(levelInputs({
        x01Games: gamesOf('x01'),
        cricketGames: gamesOf('cricket'),
        eliminationGames: gamesOf('elimination'),
        clockGames: gamesOf('clock'),
        playerId,
        badgeCount: countBadges(player.badges),
    }));
    const botTrainings = await db.x01Training.find({ players: playerId, hasWinner: true }, 'playerModels').lean();
    const counts = {
        ...metrics,
        botTrainings: botTrainings.length,
        botWins: botTrainings.filter(training => training.playerModels?.[playerId]?.hasWonGame === true).length,
    };
    return flightStanding({ counts, levelIndex: level.index, unlocked: player.flights?.unlocked ?? [], levels: LEVELS });
};
