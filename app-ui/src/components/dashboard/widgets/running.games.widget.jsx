import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';

import GamePlayers from './game.players';
import GameTypeTag from '../../elements/game.type.tag';
import GameTypeIcon from '../../elements/game.type.icon';
import { playPath } from '../../../utils/game.paths';
import { t } from '../../../utils/i18n';
import { formatDate } from '../../../utils/dates';

/**
 * Games in progress, each with a button to continue playing.
 */
const RunningGamesWidget = ({ widget, games: running, total, players }) => {
    const navigate = useNavigate();

    return (
        <Panel header={widget.title} className="h-100 dashboard-widget">
            {running.length === 0
                ? <p className="text-subtle fs-7 m-0 p-2">{t('No game is running. Start one from the menu.')}</p>
                : (
                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                        {running.map(game => (
                            <li key={game.id} className="bg-surface-raised rounded-2 p-3 d-flex align-items-center gap-3">
                                <GameTypeIcon type={game.type} />
                                <div className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <GameTypeTag type={game.type} />
                                        <span className="text-faint fs-8">{formatDate(game.playedAt, { time: true })}</span>
                                    </div>
                                    <GamePlayers game={game} players={players} />
                                </div>
                                {/* the icon button of the lists */}
                                <div className="row-actions">
                                    <Button type="button" icon="pi pi-play" aria-label={t('Continue this game')} title={t('Continue playing')} onClick={() => navigate(playPath(game.type, game.id))} />
                                </div>
                            </li>
                        ))}
                        {total > running.length &&
                            <li className="text-faint fs-8 text-center pt-1">
                                {t('and')}{' '}{total - running.length}{' '}{t('older')}{' '}{total - running.length === 1 ? t('game') : t('games')}{' '}{t('that were never finished')}
                            </li>
                        }
                    </ul>
                )
            }
        </Panel>
    );
};

export default RunningGamesWidget;
