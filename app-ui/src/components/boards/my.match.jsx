import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

import { BOARD_STATUS } from './board.words';
import { playPath } from '../../utils/game.paths';
import { t } from '../../utils/i18n';

/**
 * "Your match": the board the player is called to, large, whom they play
 * and Start (or Go on once the game runs), on top of the tournament page and
 * the club night page. match: { board, status: 'called' | 'playing',
 * opponent: name, detail, game: { kind, id } | null }; onStart() starts it
 * (none: no Start here, e.g. on another page).
 */
const MyMatch = ({ match, onStart, busy = false }) => {
    const status = BOARD_STATUS[match.status];
    return (
        <section className="my-match" aria-label={t('Your match')}>
            <span className="my-match-board">
                <span>{t('Your match')}</span>
                <strong>{t('Board {{number}}', { number: match.board })}</strong>
            </span>
            <span className="my-match-body">
                <span className="text-default fs-5 fw-semibold text-truncate">{t('against {{name}}', { name: match.opponent })}</span>
                {match.detail && <span className="text-faint fs-8">{match.detail}</span>}
                {status && <Tag value={status.label} severity={status.severity} className="align-self-start mt-1" />}
            </span>
            <span className="my-match-actions">
                {match.status === 'called' && onStart && <Button label={t('Start the match')} icon="pi pi-play" size="small" loading={busy} onClick={onStart} />}
                {match.status === 'playing' && match.game &&
                    <Link to={playPath(match.game.kind, match.game.id)} className="p-button p-button-sm text-decoration-none"><i className="pi pi-play me-2" aria-hidden="true" />{t('Go on with the match')}</Link>}
            </span>
        </section>
    );
};

export default MyMatch;
