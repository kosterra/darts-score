import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { FaTrophy } from 'react-icons/fa6';
import dayjs from 'dayjs';

import GameTypeIcon from '../elements/game.type.icon';
import { KpiHero } from '../stats/players/kpi';
import { trainingOf } from '../../rules/trainings';
import { trainingOverview } from '../../utils/training.overview';
import { formatTrainingTime } from '../../utils/training.time';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { locale, t, tn } from '../../utils/i18n';

const GREEN = '#7ecca5';
const RANKING_SHOWN = 10;
const PODIUM = ['#ffc94d', '#c9d1d9', '#d29a6a'];
const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

// a kind of training: its name and the icon of its badge (see game.type.icon)
const titleOf = (kind) => (kind === 'atc' ? t('Around the Clock') : kind === 'x01' ? t('X01 against the bot') : trainingOf(kind)?.title ?? kind);
const iconOf = (kind) => (kind === 'atc' ? 'atc' : kind === 'x01' ? 'bot' : kind);

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
    const overview = useMemo(() => trainingOverview(rows), [rows]);
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);

    if (!overview.total) return null;
    const top = overview.popular[0];
    const term = search.trim().toLowerCase();
    const playerFor = (entry) => playerOf({ player: entry.player }) ?? entry.player;
    const shown = term
        ? overview.ranking.filter(entry => [playerFor(entry)?.nickname, playerFor(entry)?.firstname, playerFor(entry)?.lastname].some(text => text?.toLowerCase().includes(term)))
        : showAll ? overview.ranking : overview.ranking.slice(0, RANKING_SHOWN);
    const placeOf = (entry) => overview.ranking.findIndex(other => other.count === entry.count) + 1;
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
                        {overview.ranking.length > RANKING_SHOWN &&
                            <span className="p-input-icon-left w-100 mb-3">
                                <i className="pi pi-search" />
                                <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search players')} aria-label={t('Search players')} className="w-100" />
                            </span>}
                        {shown.length === 0
                            ? <span className="text-faint fs-7">{t('No player matches “')}{search}”.</span>
                            : <ol className="badge-ranking list-unstyled m-0">
                                {shown.map(entry => {
                                    const place = placeOf(entry);
                                    const podium = place <= 3 ? PODIUM[place - 1] : null;
                                    const player = playerFor(entry);
                                    return (
                                        <li key={entry.playerId}>
                                            <Link to={`/players/${entry.playerId}`} className="badge-ranking-row" style={{ '--podium': podium ?? 'transparent' }}>
                                                <span className="badge-ranking-place" aria-label={t('Place {{place}}', { place })}>
                                                    {podium ? <FaTrophy style={{ color: podium }} aria-hidden="true" /> : place}
                                                </span>
                                                <PlayerAvatar player={player} className="avatar-md" />
                                                <span className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                                                    <span className="d-flex align-items-baseline justify-content-between gap-2">
                                                        <span className="text-default fw-semibold text-truncate">{player?.nickname}</span>
                                                        <span className="text-subtle fs-8 text-nowrap"><strong className="text-default">{entry.count}</strong>{' '}{entry.count === 1 ? t('training') : t('trainings')}</span>
                                                    </span>
                                                    <span className="badge-ranking-bar is-green" aria-hidden="true"><span style={{ width: `${entry.count / overview.ranking[0].count * 100}%` }} /></span>
                                                    <span className="text-faint fs-8">
                                                        {tn(entry.last30Days, '{{count}} in the last 30 days', '{{count}} in the last 30 days')}
                                                        {entry.favourite && <> · {t('mostly {{training}}', { training: titleOf(entry.favourite) })}</>}
                                                    </span>
                                                </span>
                                                {entry.favourite && <span className="d-none d-sm-inline-flex"><GameTypeIcon type={iconOf(entry.favourite)} /></span>}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ol>}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                            {!term && !showAll && overview.ranking.length > RANKING_SHOWN
                                ? <Button type="button" label={t('Show all {{length}} players', { length: overview.ranking.length })} icon="pi pi-chevron-down" size="small" text onClick={() => setShowAll(true)} />
                                : <span />}
                            <Link to={term ? `/players?search=${encodeURIComponent(search.trim())}` : '/players'} className="text-subtle fs-8">
                                {t('All players of the club')}{' '}<i className="pi pi-arrow-right fs-9" aria-hidden="true" />
                            </Link>
                        </div>
                    </Panel>
                </div>
                <div className="col-12 col-xl-5">
                    <Panel header={t('Popular trainings')} className="h-100">
                        <ul className="training-popular list-unstyled m-0">
                            {overview.popular.map(entry => (
                                <li key={entry.kind}>
                                    <GameTypeIcon type={iconOf(entry.kind)} />
                                    <span className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
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
                                        <span className="d-flex flex-column" style={{ minWidth: 0 }}>
                                            <span className="training-card-title">{titleOf(record.kind)}</span>
                                            <span className="training-card-count">{recordDetail(record)}</span>
                                        </span>
                                    </div>
                                    <span className="training-card-value">{recordValue(record)}</span>
                                    <Link to={`/players/${player?.id}`} className="d-flex align-items-center gap-2 text-subtle fs-8">
                                        <PlayerAvatar player={player} className="avatar-xs" />
                                        <span className="text-default fw-semibold">{player?.nickname}</span>
                                        <span className="text-faint">{dayjs(record.row.createdAt).format('DD.MM.YYYY')}</span>
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
