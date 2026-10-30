import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import dayjs from 'dayjs';

import GamePlayers from './game.players';
import GameTypeTag from '../../elements/game.type.tag';
import { formatBesideType } from '../../../utils/game.format';
import GameTypeIcon from '../../elements/game.type.icon';
import { playPath } from '../../../utils/game.paths';
import GameStatusTag from '../../elements/game.status.tag';
import { t } from '../../../utils/i18n';

const INITIAL_GAMES = 8;

const dayLabel = (date) => {
    const day = dayjs(date).startOf('day');
    const today = dayjs().startOf('day');
    if (day.isSame(today)) return t('Today');
    if (day.isSame(today.subtract(1, 'day'))) return t('Yesterday');
    return day.format('dddd, DD.MM.YYYY');
};

/**
 * The club's latest games as a timeline, grouped by day.
 */
const TimelineWidget = ({ widget, games, players }) => {
    const navigate = useNavigate();
    const [showAll, setShowAll] = useState(false);

    const visible = showAll ? games : games.slice(0, INITIAL_GAMES);
    // consecutive games of the same day share one heading
    const days = [];
    for (const game of visible) {
        const label = dayLabel(game.playedAt);
        if (days.at(-1)?.label !== label) days.push({ label, games: [] });
        days.at(-1).games.push(game);
    }

    return (
        <Panel header={widget.title} className="h-100 dashboard-widget">
            {games.length === 0
                ? <p className="text-subtle fs-7 m-0 p-2">{t('No games played yet.')}</p>
                : (
                    <div className="d-flex flex-column gap-3">
                        {days.map(day => (
                            <section key={day.label}>
                                <h3 className="fs-7 fw-semibold text-subtle text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>{day.label}</h3>
                                <ol className="timeline list-unstyled m-0">
                                    {day.games.map(game => (
                                        <li key={game.id} className={`timeline-entry ${game.running ? 'timeline-running' : ''}`}>
                                            <span className="timeline-time text-faint fs-8">{dayjs(game.playedAt).format('HH:mm')}</span>
                                            <GameTypeIcon type={game.type} />
                                            <div className="timeline-body">
                                                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                    <GameTypeTag type={game.type} />
                                                    {formatBesideType(game.type, game.format) && <span className="text-faint fs-8">{game.format}</span>}
                                                </div>
                                                <GamePlayers game={game} players={players} />
                                            </div>
                                            {/* the status at the top; the icon buttons of the lists, green to continue, grey for the statistics, at the bottom */}
                                            <div className="timeline-side">
                                                <GameStatusTag running={game.running} />
                                                <div className="row-actions">
                                                    {game.running
                                                        ? <Button type="button" icon="pi pi-play" aria-label={t('Continue this game')} title={t('Continue playing')} onClick={() => navigate(playPath(game.type, game.id))} />
                                                        : <Button type="button" icon="pi pi-chart-bar" severity="secondary" aria-label={t('Statistics of this game')} title={t('Show statistics')} onClick={() => navigate(`/stats/games/${game.type}/${game.id}`)} />
                                                    }
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        ))}
                        {games.length > INITIAL_GAMES &&
                            <div className="d-flex justify-content-center">
                                <Button
                                    label={showAll ? t('Show fewer') : t('Show all {{length}}', { length: games.length })}
                                    size="small"
                                    text
                                    onClick={() => setShowAll(!showAll)}
                                />
                            </div>
                        }
                    </div>
                )
            }
        </Panel>
    );
};

export default TimelineWidget;
