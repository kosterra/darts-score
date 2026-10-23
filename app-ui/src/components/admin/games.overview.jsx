import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';

import GameTypeIcon from '../elements/game.type.icon';
import PlayerRanking from '../elements/player.ranking';
import { KpiHero } from '../stats/players/kpi';
import StatsService from '../../services/stats.service';
import { gameOf } from '../../rules/games';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { locale, t, tn } from '../../utils/i18n';

const GREEN = '#7ecca5';
const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);
const NAMES = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination', clock: 'Around the Clock' };
const titleOf = (type) => (NAMES[type] ? t(NAMES[type]) : gameOf(type)?.title ?? type);

/**
 * The games of the club at a glance, above the list: how many (in all,
 * lately, running), how many play, who plays most, the best win rates and
 * the game types played most. Over all games of the club, not only those the
 * list loads.
 */
const GamesOverview = () => {
    const [overview, setOverview] = useState(null);

    useEffect(() => {
        StatsService.loadGamesOverview().then(setOverview).catch(error => console.error('Failed to load the games overview', error));
    }, []);

    if (!overview?.total) return null;
    const playerOf = (id) => overview.playersById?.[id];
    const top = overview.popular[0];
    const most = top?.count || 1;

    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={t('Games of the club')}>
                <div className="kpi-headline">
                    <KpiHero label={t('Games')} value={formatNumber(overview.total)} color={GREEN} />
                    <KpiHero label={t('In the last 30 days')} value={formatNumber(overview.last30Days)} color={GREEN} />
                    <KpiHero label={t('Running now')} value={formatNumber(overview.running)} color={GREEN} />
                    <KpiHero label={t('Players playing')} value={formatNumber(overview.players)} color={GREEN} />
                </div>
            </Panel>

            <div className="row g-4">
                <div className="col-12 col-xl-7">
                    <Panel header={t('Most games')} className="h-100">
                        <PlayerRanking entries={overview.ranking.map(entry => ({
                            id: entry.playerId,
                            player: playerOf(entry.playerId),
                            value: entry.games,
                            label: <><strong className="text-default">{entry.games}</strong>{' '}{entry.games === 1 ? t('game') : t('games')}</>,
                            line: <>
                                {tn(entry.wins, '{{count}} win', '{{count}} wins')}
                                {' · '}{tn(entry.last30Days, '{{count}} in the last 30 days', '{{count}} in the last 30 days')}
                                {entry.favourite && <> · {t('mostly {{game}}', { game: titleOf(entry.favourite) })}</>}
                            </>,
                            icon: entry.favourite,
                        }))} />
                    </Panel>
                </div>
                <div className="col-12 col-xl-5 d-flex flex-column gap-4">
                    <Panel header={t('Popular games')}>
                        <ul className="training-popular list-unstyled m-0">
                            {overview.popular.map(entry => (
                                <li key={entry.type}>
                                    <GameTypeIcon type={entry.type} />
                                    <span className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                                        <span className="d-flex align-items-baseline justify-content-between gap-2">
                                            <span className="text-default fs-7 fw-semibold text-truncate">{titleOf(entry.type)}</span>
                                            <span className="text-subtle fs-8 text-nowrap"><strong className="text-default">{entry.count}</strong>{entry.last30Days ? ` · ${t('{{count}} lately', { count: entry.last30Days })}` : ''}</span>
                                        </span>
                                        <span className="badge-ranking-bar is-green" aria-hidden="true"><span style={{ width: `${entry.count / most * 100}%` }} /></span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                    {overview.winRates.length > 0 &&
                        <Panel header={t('Best win rates')} className="flex-grow-1">
                            <p className="text-faint fs-8 mt-0">{t('From 5 finished games.')}</p>
                            <ol className="list-unstyled m-0 d-flex flex-column gap-2">
                                {overview.winRates.map((entry, index) => {
                                    const player = playerOf(entry.playerId);
                                    return (
                                        <li key={entry.playerId}>
                                            <Link to={`/players/${entry.playerId}`} className="badge-feed-row text-decoration-none">
                                                <span className="badge-ranking-place text-faint fw-bold">{index + 1}</span>
                                                <Avatar
                                                    label={player?.profileImg ? undefined : resolvePlayerInitials(player?.firstname ?? '?', player?.lastname ?? '')}
                                                    image={resolvePlayerImg(player?.profileImg)}
                                                    shape="circle"
                                                    className="avatar-sm bg-surface-high flex-shrink-0"
                                                />
                                                <span className="text-default fw-semibold flex-grow-1 text-truncate">{player?.nickname}</span>
                                                <span className="text-subtle fs-8 text-nowrap">{t('{{wins}} of {{games}}', { wins: entry.wins, games: entry.games })}</span>
                                                <strong className="text-default">{entry.rate.toFixed(1)} %</strong>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ol>
                        </Panel>}
                </div>
            </div>
        </div>
    );
};

export default GamesOverview;
