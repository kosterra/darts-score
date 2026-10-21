import { Button } from 'primereact/button';
import { MdReplay } from 'react-icons/md';
import { PiShuffle, PiUserSwitch } from 'react-icons/pi';

/**
 * What to do after a game: play it again (the same order, or with two
 * players switched, with more shuffled), set up a new one or go home.
 * onRestart(switchPlayers, shufflePlayers), onNewGame(), onHome().
 */
const GameResultActions = ({ playerCount, onRestart, onNewGame, onHome }) => (
    <>
        <div className="result-hero-again">
            <Button label="Play again" icon={<MdReplay className="p-button-icon-left" />} onClick={() => onRestart()} size="small" />
            {playerCount === 2 &&
                <Button label="Switch players" icon={<PiUserSwitch className="p-button-icon-left" />} onClick={() => onRestart(true)} size="small" severity="secondary" title="Play again, the other player starts" />}
            {playerCount > 2 &&
                <Button label="Shuffle players" icon={<PiShuffle className="p-button-icon-left" />} onClick={() => onRestart(false, true)} size="small" severity="secondary" title="Play again in a new order" />}
        </div>
        <span className="result-hero-actions-divider" aria-hidden="true" />
        <Button label="New game" icon="pi pi-plus" onClick={onNewGame} size="small" severity="secondary" text />
        <Button label="Home" icon="pi pi-home" onClick={onHome} size="small" severity="secondary" text />
    </>
);

export default GameResultActions;
