import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { t } from '../../../utils/i18n';

/**
 * What to do after a game: play it again (the same order, or with two
 * players switched, with more shuffled), set up a new one, or compare its
 * players (compare: { players, type }, when there is something to compare);
 * home is in the menu. onRestart(switchPlayers, shufflePlayers), onNewGame().
 * goOnTo: the game is not finished yet; the page of the game, to go on with it
 * instead of playing it again.
 */
const GameResultActions = ({ playerCount, onRestart, onNewGame, compare = null, goOnTo = null }) => {
    const params = compare ? new URLSearchParams({ players: compare.players.map(player => player.id ?? player).join(','), ...(compare.type && { type: compare.type }) }) : null;
    if (goOnTo) {
        return (
            <>
                <div className="result-hero-again">
                    <Link to={goOnTo} className="p-button p-button-sm text-decoration-none"><i className="pi pi-play me-2" aria-hidden="true" />{t('Go on with the game')}</Link>
                </div>
                <span className="text-subtle fs-7">{t('Not finished yet: nobody has won.')}</span>
            </>
        );
    }
    return (
        <>
            <div className="result-hero-again">
                <Button label={t('Play again')} icon="pi pi-replay" onClick={() => onRestart()} size="small" />
                {playerCount === 2 &&
                    <Button label={t('Switch players')} icon="pi pi-users" onClick={() => onRestart(true)} size="small" severity="secondary" title={t('Play again, the other player starts')} />}
                {playerCount > 2 &&
                    <Button label={t('Shuffle players')} icon="pi pi-sync" onClick={() => onRestart(false, true)} size="small" severity="secondary" title={t('Play again in a new order')} />}
            </div>
            <span className="result-hero-actions-divider" aria-hidden="true" />
            <Button label={t('New game')} icon="pi pi-plus" onClick={onNewGame} size="small" severity="secondary" text />
            {params &&
                <Link to={`/stats/players?${params.toString()}`} className="p-button p-button-sm p-button-text p-button-secondary text-decoration-none" title={t('Compare these players')}>
                    <i className="pi pi-chart-bar me-2" aria-hidden="true" />{t('Compare')}
                </Link>}
        </>
    );
};

export default GameResultActions;
