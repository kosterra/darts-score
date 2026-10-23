import { useMemo } from 'react';
import { Panel } from 'primereact/panel';

import GameTypeIcon from '../elements/game.type.icon';
import { SpreadList } from './installation.parts';
import { formatNumber } from './installation.utils';
import { KpiHero } from '../stats/players/kpi';
import { quickGamesOverview } from '../../utils/admin.overviews';
import { gameTitle } from './kind.titles';
import { t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;

/**
 * The quick games kept now at a glance, above their list: how many, lately,
 * running and finished, the games started per day over the last 30 days,
 * the formats played most and how many play a game.
 * data: as the list loads it ({ games, perDay, total }); days: the last 30 days
 */
const QuickGamesOverview = ({ data, days }) => {
    const overview = useMemo(() => quickGamesOverview(data?.games ?? []), [data]);
    const most = Math.max(1, ...days.map(day => day.games));
    const mostFormat = overview.formats[0]?.count || 1;

    if (!data) return null;
    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={t('Quick games at a glance')}>
                <div className="kpi-headline">
                    <KpiHero label={t('Kept now')} value={formatNumber(data.total ?? overview.total)} detail={t('the last 30 days')} color={GREEN} />
                    <KpiHero label={t('In the last 7 days')} value={formatNumber(overview.last7Days)} color={GREEN} />
                    <KpiHero label={t('Running now')} value={formatNumber(overview.running)} color={GREEN} />
                    <KpiHero label={t('Finished')} value={formatNumber(overview.finished)} detail={t('{{percent}} % of them', { percent: overview.finishRate })} color={GREEN} />
                </div>

                <div className="quick-games-days mt-4" aria-label={t('Quick games started per day, the last 30 days')}>
                    {days.map(day => (
                        <span key={day.day} className="quick-games-day" title={t('{{format}}: {{games}} started, {{finished}} finished', { format: formatDate(day.day), games: day.games, finished: day.finished })}>
                            <span className="is-started" style={{ height: `${(day.games / most) * 100}%` }} />
                            <span className="is-finished" style={{ height: `${(day.finished / most) * 100}%` }} />
                        </span>
                    ))}
                </div>
                <p className="text-faint fs-8 mt-1 mb-0">
                    {t('The last 30 days: started')}{' '}<span className="quick-games-key is-started" />{' '}{t('and finished')}{' '}<span className="quick-games-key is-finished" />.
                </p>
            </Panel>

            {overview.total > 0 &&
                <div className="row g-4">
                    <div className="col-12 col-xl-7">
                        <Panel header={t('Formats played most')} className="h-100">
                            <ul className="training-popular list-unstyled m-0">
                                {overview.formats.slice(0, 8).map(entry => (
                                    <li key={`${entry.kind}-${entry.format}`}>
                                        <GameTypeIcon type={entry.kind} />
                                        <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                            <span className="d-flex align-items-baseline justify-content-between gap-2">
                                                <span className="text-default fs-7 fw-semibold text-truncate">{gameTitle(entry.kind)} · {entry.format}</span>
                                                <strong className="text-default fs-8">{formatNumber(entry.count)}</strong>
                                            </span>
                                            <span className="badge-ranking-bar is-green" aria-hidden="true"><span style={{ width: `${entry.count / mostFormat * 100}%` }} /></span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    </div>
                    <div className="col-12 col-xl-5">
                        <Panel header={t('Players per game')} className="h-100">
                            <SpreadList entries={overview.sizes.map(size => ({
                                key: size.players,
                                label: size.players >= 4 ? t('4 players or more') : tn(size.players, '{{count}} player', '{{count}} players'),
                                count: size.count,
                                icon: size.players === 1 ? 'pi pi-user' : 'pi pi-users',
                            }))} />
                        </Panel>
                    </div>
                </div>
            }
        </div>
    );
};

export default QuickGamesOverview;
