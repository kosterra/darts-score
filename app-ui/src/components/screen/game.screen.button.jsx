import BigScreenButton from './big.screen.button';
import EveningService from '../../services/evening.service';

/**
 * Big screen in the header of a running game: a club game gets its own; a
 * game of a darts evening sends the evening (the screen follows its games);
 * a quick game on its own and a training none. Gone once the game is over.
 */
const GameScreenButton = ({ kind, game, quick = false, training = false }) => {
    const id = game?.id ?? game?._id;
    if (!id || training || game.hasWinner) return null;
    if (quick) {
        if (!game.evening) return null;
        return <BigScreenButton create={() => EveningService.screenLink(game.evening)} send={(code) => EveningService.sendToTv(game.evening, code)} />;
    }
    return <BigScreenButton kind={kind} gameId={id} />;
};

export default GameScreenButton;
