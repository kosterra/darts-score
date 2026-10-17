import EliminationModels from '../models/elimination.models';
import { shufflePlayers } from './game.utils';

/**
 * A new Elimination game with the settings and players of "game": in the
 * same order, the other way round (switchPlayers) or shuffled (shuffle).
 */
export const eliminationRematch = (game, { switchPlayers = false, shuffle = false } = {}) => {
    const players = switchPlayers ? [...game.players].reverse()
        : shuffle ? shufflePlayers(game.players)
        : [...game.players];
    return {
        ...EliminationModels.EliminationModel,
        targetScore: game.targetScore,
        gameInMode: game.gameInMode,
        gameOutMode: game.gameOutMode,
        numberOfPlayers: players.length,
        isSoloGame: players.length === 1,
        players,
        startingPlayer: players[0],
        currentPlayerTurn: players[0],
        playerModels: Object.fromEntries(players.map(player => [player, { ...EliminationModels.EliminationPlayerModel }])),
    };
};
