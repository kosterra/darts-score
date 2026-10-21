import CricketModels from '../models/cricket.models';
import { shufflePlayers } from './game.utils';
import { variantOf } from './cricket.variants';

/**
 * A new Cricket game with the players of "game": in the same order, the
 * other way round (switchPlayers) or shuffled (shuffle).
 */
export const cricketRematch = (game, { switchPlayers = false, shuffle = false } = {}) => {
    const players = switchPlayers ? [...game.players].reverse()
        : shuffle ? shufflePlayers(game.players)
        : [...game.players];
    return {
        ...CricketModels.CricketGameModel,
        isSoloGame: players.length === 1,
        startingScore: game.startingScore,
        variant: variantOf(game),
        // the dart animation as the game had it, also when it was switched on or off for everyone
        flyingDarts: game.flyingDarts ?? 'players',
        numberOfPlayers: players.length,
        players,
        currentPlayerTurn: players[0],
        playerModels: Object.fromEntries(players.map(player => [player, {
            ...CricketModels.CricketPlayerModel,
            score: Number(game.startingScore),
        }])),
    };
};
