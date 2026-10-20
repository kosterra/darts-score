import { dartsFly, flightOf } from '../../../utils/flights';

/**
 * How the darts of the player at the oche look on the board to tap:
 * { withDarts, flight }. Whether they fly: the game decides, or the player
 * (for the bot the one training against it); the flights are the player's,
 * in their colour of the game unless they chose one.
 */
const useBoardDarts = (game, players = []) => {
    const atOche = players.find(player => player.id === game.currentPlayerTurn);
    const decider = atOche?.isBot ? players.find(player => !player.isBot) : atOche;
    return {
        withDarts: dartsFly(game, decider),
        flight: flightOf(atOche, game.players.indexOf(game.currentPlayerTurn)),
    };
};

export default useBoardDarts;
