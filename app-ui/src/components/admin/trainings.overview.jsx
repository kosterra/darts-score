import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';

import GameTypeIcon from '../elements/game.type.icon';
import PlayerRanking from '../elements/player.ranking';
import { KpiHero } from '../stats/players/kpi';
import { trainingOf } from '../../rules/trainings';
import { trainingIcon as iconOf, trainingTitle as titleOf } from './kind.titles';
import { trainingOverview } from '../../utils/training.overview';
import { formatTrainingTime } from '../../utils/training.time';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { locale, t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { OverviewSkeleton } from '../elements/skeletons';
import { ACCENT } from '../../utils/palette';

const GREEN = ACCENT.green;
const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);


const PlayerAvatar = ({ player, className = 'avatar-sm' }) => (
    <Avatar
        label={player?.profileImg ? undefined : resolvePlayerInitials(player?.firstname ?? player?.nickname ?? '?', player?.lastname ?? '')}
        image={resolvePlayerImg(player?.profileImg)}
        shape="circle"
        className={`${className} bg-surface-high flex-shrink-0`}
    />
);

// a record in words: the time, the darts, the average or the score of the training
const recordValue = (record) => {
    if (record.label === 'time') return formatTrainingTime(record.value);
    if (record.label === 'darts') return tn(record.value, '{{count}} dart', '{{count}} darts');
    if (record.label === 'average') return t('{{average}} average', { average: record.value.toFixed(1) });
    return trainingOf(record.kind)?.format(record.value) ?? record.value;
};
const recordDetail = (record) => {
    if (record.label === 'time') return t('fastest · {{mode}}', { mode: t(record.row.mode ?? 'All') });
    if (record.label === 'darts') return t('fewest darts · {{mode}}', { mode: t(record.row.mode ?? 'All') });
    if (record.label === 'average') return t('best average against the bot');
    return t('best');
};

/**
 * The trainings of the club at a glance, above the list: how many, who
 * trains most, what is trained most and the records of the club.
 * rows: the rows of the trainings list; playerOf(row): the player as they are now
 */
const TrainingsOverview = ({ rows, playerOf }) => {
    const overview = useMemo(() => trainingOverview(rows ?? []), [rows]);

    if (!rows) return <OverviewSkeleton title={t('Trainings of the club')} />;
    if (!overview.total) return null;
    const top = overview.popular[0];
    const playerFor = (entry) => playerOf({ player: entry.player }) ?? entry.player;
    const most = overview.popular[0]?.count ?? 1;

    return (
        <div className="d-flex flex-column gap-4 mb-4">
            <Panel header={t('Trainings of the club')}>
                <div className="kpi-headline">
                    <KpiHero label={t('Trainings')} value={formatNumber(overview.total)} color={GREEN} />
                    <KpiHero label={t('In the last 30 days')} value={formatNumber(overview.last30Days)} color={GREEN} />
                    <KpiHero label={t('Players training')} value={formatNumber(overview.trainees)} color={GREEN} />
                    <KpiHero label={t('{{training}}, trained most', { training: titleOf(top.kind) })} value={formatNumber(top.count)} color={GREEN} />
                </div>
            </Panel>

            <div className="row g-4">
                <div className="col-12 col-xl-7">
                    <Panel header={t('Training most')} className="h-100">
                        <PlayerRanking entries={overview.ranking.map(entry => ({
                            id: entry.playerId,
                            player: playerFor(entry),
                            value: entry.count,
                            label: <><strong className="text-default">{entry.count}</strong>{' '}{entry.count === 1 ? t('training') : t('trainings')}</>,
                            line: <>{tn(entry.last30Days, '{{count}} in the last 30 days', '{{count}} in the last 30 days')}{entry.favourite && <> · {t('mostly {{training}}', { training: titleOf(entry.favourite) })}</>}</>,
                            icon: entry.favourite && iconOf(entry.favourite),
                        }))} />
                    </Panel>
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header={t('Popular trainings')} className="h-100">
                        <ul className="training-popular list-unstyled m-0">
                            {overview.popular.map(entry => (
                                <li key={entry.kind}>
                                    <GameTypeIcon type={iconOf(entry.kind)} />
                                    <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                                        <span className="d-flex align-items-baseline justify-content-between gap-2">
                                            <span className="text-default fs-7 fw-semibold text-truncate">{titleOf(entry.kind)}</span>
                                            <span className="text-subtle fs-8 text-nowrap"><strong className="text-default">{entry.count}</strong>{entry.last30Days ? ` · ${t('{{count}} lately', { count: entry.last30Days })}` : ''}</span>
                                        </span>
                                        <span className="badge-ranking-bar is-green" aria-hidden="true"><span style={{ width: `${entry.count / most * 100}%` }} /></span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
            </div>

            {overview.records.length > 0 &&
                <Panel header={t('Club records')}>
                    <div className="training-cards">
                        {overview.records.map(record => {
                            const player = playerOf(record.row) ?? record.row.player;
                            return (
                                <div key={record.key} className="training-card" style={{ '--kpi-color': GREEN }}>
                                    <div className="training-card-head">
                                        <GameTypeIcon type={iconOf(record.kind)} />
                                        <span className="d-flex flex-column min-w-0">
                                            <span className="training-card-title">{titleOf(record.kind)}</span>
                                            <span className="training-card-count">{recordDetail(record)}</span>
                                        </span>
                                    </div>
                                    <span className="training-card-value">{recordValue(record)}</span>
                                    <Link to={`/players/${player?.id}`} className="d-flex align-items-center gap-2 text-subtle fs-8">
                                        <PlayerAvatar player={player} className="avatar-xs" />
                                        <span className="text-default fw-semibold">{player?.nickname}</span>
                                        <span className="text-faint">{formatDate(record.row.createdAt)}</span>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </Panel>
            }
        </div>
    );
};

export default TrainingsOverview;
