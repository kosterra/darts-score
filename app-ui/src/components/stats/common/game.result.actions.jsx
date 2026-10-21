import { Button } from 'primereact/button';
import { MdReplay } from 'react-icons/md';
import { PiShuffle, PiUserSwitch } from 'react-icons/pi';
import { t } from '../../../utils/i18n';

/**
 * What to do after a game: play it again (the same order, or with two
 * players switched, with more shuffled) or set up a new one; home is in the
 * menu. onRestart(switchPlayers, shufflePlayers), onNewGame().
 */
const GameResultActions = ({ playerCount, onRestart, onNewGame }) => (
    <>
        <div className="result-hero-again">
            <Button label={t('Play again')} icon={<MdReplay className="p-button-icon-left" />} onClick={() => onRestart()} size="small" />
            {playerCount === 2 &&
                <Button label={t('Switch players')} icon={<PiUserSwitch className="p-button-icon-left" />} onClick={() => onRestart(true)} size="small" severity="secondary" title={t('Play again, the other player starts')} />}
            {playerCount > 2 &&
                <Button label={t('Shuffle players')} icon={<PiShuffle className="p-button-icon-left" />} onClick={() => onRestart(false, true)} size="small" severity="secondary" title={t('Play again in a new order')} />}
        </div>
        <span className="result-hero-actions-divider" aria-hidden="true" />
        <Button label={t('New game')} icon="pi pi-plus" onClick={onNewGame} size="small" severity="secondary" text />
    </>
);

export default GameResultActions;
