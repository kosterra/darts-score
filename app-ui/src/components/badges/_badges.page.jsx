import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { FaFire, FaTrophy } from "react-icons/fa6";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import StatsService from '../../services/stats.service';
import PageLoader from '../elements/page.loader';
import BadgeMedal from './badge.medal';
import HallOfShame from './hall.of.shame';
import { useClubShame } from './hall.of.shame.data';
import { KpiHero } from '../stats/players/kpi';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { locale, t, tn } from '../../utils/i18n';

dayjs.extend(relativeTime);

const GOLD = '#ffc94d';
const UNCLAIMED_SHOWN = 12;
// the ranking shows the first ones; a search or "Show all" the others
const RANKING_SHOWN = 10;
const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);
const weeks = (count) => tn(count, '{{count}} week', '{{count}} weeks');
// the places on the podium
const PODIUM = ['#ffc94d', '#c9d1d9', '#d29a6a'];

const PlayerAvatar = ({ player, className = 'avatar-sm' }) => (
    <Avatar
        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
        image={resolvePlayerImg(player.profileImg)}
        shape="circle"
        className={`${className} bg-surface-high flex-shrink-0`}
    />
);

// a player's badges on their statistics page
const toPlayer = (player) => `/players/${player.id}#badges`;

/**
 * Weeks played in a row: the running streak and the best one so far.
 */
const WeekStreak = ({ streak }) => {
    if (!streak) return null;
    if (streak.best === 0) return <span className="text-faint fs-8">{t('Not played yet')}</span>;
    return (
        <span className="d-flex flex-wrap align-items-center column-gap-3 fs-8">
            <span className={streak.current > 0 ? 'text-default' : 'text-faint'}>
                <FaFire className={`me-1 ${streak.current > 0 ? 'text-orange' : ''}`} aria-hidden="true" />
                {streak.current > 0 ? t('{{weeks}} in a row', { weeks: weeks(streak.current) }) : t('No current streak')}
            </span>
            <span className="text-faint">{t('Best:')}{' '}{weeks(streak.best)}</span>
        </span>
    );
};

/**
 * Who collected most: every player ranked, the first three on the podium,
 * with the share of the collection, the latest badges and the week streak.
 */
const Ranking = ({ players, all, total }) => (
    <ol className="badge-ranking list-unstyled m-0">
        {players.map((player, index) => {
            // the same count shares a place, among all players of the club
            const place = all.findIndex(other => other.earnedCount === player.earnedCount) + 1;
            const podium = player.earnedCount > 0 && place <= 3 ? PODIUM[place - 1] : null;
            return (
                <li key={player.id}>
                    <Link to={toPlayer(player)} className="badge-ranking-row" style={{ '--podium': podium ?? 'transparent' }}>
                        <span className="badge-ranking-place" aria-label={t('Place {{place}}', { place })}>
                            {podium ? <FaTrophy style={{ color: podium }} aria-hidden="true" /> : place}
                        </span>
                        <PlayerAvatar player={player} className="avatar-md" />
                        <span className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                            <span className="d-flex align-items-baseline justify-content-between gap-2">
                                <span className="text-default fw-semibold text-truncate">{player.nickname}</span>
                                <span className="text-subtle fs-8 text-nowrap"><strong className="text-default">{player.earnedCount}</strong>{' '}{t('of')}{' '}{total}</span>
                            </span>
                            <span className="badge-ranking-bar" aria-hidden="true"><span style={{ width: `${total ? player.earnedCount / total * 100 : 0}%` }} /></span>
                            <WeekStreak streak={player.weekStreak} />
                        </span>
                        <span className="d-none d-sm-flex gap-1 flex-shrink-0">
                            {player.latest.map(badge => <BadgeMedal key={badge.id} badge={badge} size="sm" />)}
                        </span>
                    </Link>
                    {/* where the podium ends: before the first player behind the first three places */}
                    {podium && players[index + 1] && !(players[index + 1].earnedCount > 0 && all.findIndex(other => other.earnedCount === players[index + 1].earnedCount) < 3) && <hr className="badge-ranking-cut" />}
                </li>
            );
        })}
    </ol>
);

/**
 * Badge overview of the club: the figures, who collected most, the Hall of
 * Shame, what was earned lately, the rarest badges and those still to win.
 */
const BadgesOverview = () => {
    const [overview, setOverview] = useState(null);
    const shame = useClubShame();
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        StatsService.loadClubBadges().then(setOverview).catch(error => console.error('Failed to load badges', error));
    }, []);

    if (!overview) return <PageLoader />;
    const unclaimed = overview.unclaimed ?? [];
    // the first ones, all of them, or those matching the search (with their place in the club)
    const term = search.trim().toLowerCase();
    const shownPlayers = term
        ? overview.players.filter(player => [player.nickname, player.firstname, player.lastname, `${player.firstname} ${player.lastname}`].some(text => text?.toLowerCase().includes(term)))
        : showAll ? overview.players : overview.players.slice(0, RANKING_SHOWN);
    // the badges earned lately in the club, newest first
    const recentPanel = (
                <Panel header={t('Recently earned')}>
                    {(overview.recent ?? []).length === 0
                        ? <span className="text-faint fs-7">{t('No badges earned yet.')}</span>
                        : <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                            {overview.recent.map((entry, index) => (
                                <li key={`${entry.player.id}-${entry.badge.id}-${index}`} className="badge-feed-row">
                                    <BadgeMedal badge={entry.badge} size="sm" />
                                    <span className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                                        <span className="text-default fs-7 fw-semibold text-truncate" title={entry.badge.description}>{entry.badge.title}</span>
                                        <Link to={toPlayer(entry.player)} className="text-subtle fs-8 text-truncate">{entry.player.nickname}</Link>
                                    </span>
                                    <span className="text-faint fs-8 text-nowrap">{dayjs(entry.earnedAt).fromNow()}</span>
                                </li>
                            ))}
                        </ul>}
                </Panel>
    );

    return (
        <div className="d-flex flex-column gap-4">
            <Panel header={t('Badges')}>
                <p className="text-subtle fs-7 mt-0 mb-4">
                    {t('Players collect badges for what they achieve in games and trainings. Pick a player to see their profile with the whole collection.')}
                </p>
                <div className="kpi-headline">
                    <KpiHero label={t('Badges earned')} value={formatNumber(overview.earned)} color={GOLD} />
                    <KpiHero label={t('In the last 30 days')} value={formatNumber(overview.earnedLast30Days)} color={GOLD} />
                    <KpiHero label={t('Players collecting')} value={`${formatNumber(overview.collectors)} / ${formatNumber(overview.players.length)}`} color={GOLD} />
                    <KpiHero label={t('Nobody has yet')} value={`${formatNumber(unclaimed.length)} / ${formatNumber(overview.total)}`} color={GOLD} />
                </div>
            </Panel>

            {/* the ranking with what was earned lately; next to it the Hall of Shame (or, without it, what was earned lately) */}
            <div className="row g-4">
                <div className="col-12 col-xl-7 d-flex flex-column gap-4">
                    <Panel header={t('Most badges')}>
                        {overview.players.length === 0
                            ? <span className="text-subtle">{t('This club has no players yet.')}</span>
                            : <>
                                {overview.players.length > RANKING_SHOWN &&
                                    <span className="p-input-icon-left w-100 mb-3">
                                        <i className="pi pi-search" />
                                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search players')} aria-label={t('Search players')} className="w-100" />
                                    </span>}
                                {shownPlayers.length
                                    ? <Ranking players={shownPlayers} all={overview.players} total={overview.total} />
                                    : <span className="text-faint fs-7">{t('No player matches “')}{search}”.</span>}
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                                    {!term && !showAll && overview.players.length > RANKING_SHOWN
                                        ? <Button type="button" label={t('Show all {{length}} players', { length: overview.players.length })} icon="pi pi-chevron-down" size="small" text onClick={() => setShowAll(true)} />
                                        : <span />}
                                    {/* the players list, for the statistics of any player */}
                                    <Link to={term ? `/players?search=${encodeURIComponent(search.trim())}` : '/players'} className="text-subtle fs-8">
                                        {t('All players of the club')}{' '}<i className="pi pi-arrow-right fs-9" aria-hidden="true" />
                                    </Link>
                                </div>
                            </>}
                    </Panel>
                    {shame?.enabled && recentPanel}
                </div>
                <div className="col-12 col-xl-5">
                    {shame?.enabled
                        ? <Panel header={t('Hall of Shame')} className="h-100">
                            <p className="text-faint fs-8 mt-0">{t('Who holds each shame badge right now, until someone else takes it over or they wash it off.')}</p>
                            <HallOfShame shame={shame} />
                        </Panel>
                        : recentPanel}
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 col-xl-6">
                    <Panel header={t('Rarest in the club')} className="h-100">
                        <p className="text-faint fs-8 mt-0">{t('Badges only one or two players of the club have.')}</p>
                        {(overview.rare ?? []).length === 0
                            ? <span className="text-faint fs-7">{t('No badge is rare in the club yet.')}</span>
                            : <ul className="list-unstyled m-0 d-flex flex-column gap-3">
                                {overview.rare.map(entry => (
                                    <li key={entry.badge.id} className="badge-feed-row">
                                        <BadgeMedal badge={entry.badge} size="sm" />
                                        <span className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                                            <span className="text-default fs-7 fw-semibold">{entry.badge.title}</span>
                                            <span className="text-faint fs-8">{entry.badge.description}</span>
                                        </span>
                                        <span className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
                                            {entry.holders.map(holder => (
                                                <Link key={holder.id} to={toPlayer(holder)} className="d-inline-flex align-items-center gap-2 text-subtle fs-8">
                                                    {holder.nickname}
                                                    <PlayerAvatar player={holder} className="avatar-xs" />
                                                </Link>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>}
                    </Panel>
                </div>
                <div className="col-12 col-xl-6">
                    <Panel header={t('Still to win')} className="h-100">
                        <p className="text-faint fs-8 mt-0">{t('Nobody in the club has these yet, the first steps first: who gets them first?')}</p>
                        {unclaimed.length === 0
                            ? <span className="text-faint fs-7">{t('Every badge has been won in the club.')}</span>
                            : <>
                                <ul className="badge-unclaimed list-unstyled m-0">
                                    {unclaimed.slice(0, UNCLAIMED_SHOWN).map(badge => (
                                        <li key={badge.id} title={badge.description}>
                                            <BadgeMedal badge={badge} size="sm" locked />
                                            <span className="text-subtle fs-8 text-center">{badge.title}</span>
                                        </li>
                                    ))}
                                </ul>
                                {unclaimed.length > UNCLAIMED_SHOWN &&
                                    <span className="d-block text-faint fs-8 mt-3">{tn(unclaimed.length - UNCLAIMED_SHOWN, 'and {{count}} more', 'and {{count}} more')}</span>}
                            </>}
                    </Panel>
                </div>
            </div>
        </div>
    );
};

const BadgesPage = () => {
    const { id } = useParams();

    // a player's collection is part of their profile now
    if (id) return <Navigate replace to={`/players/${id}#badges`} />;

    return (
        <div className="container-fluid p-4 border-0">
            <BadgesOverview />
        </div>
    );
};

export default BadgesPage;
