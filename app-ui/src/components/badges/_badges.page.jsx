import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { ProgressBar } from 'primereact/progressbar';
import { FaFire } from "react-icons/fa6";

import StatsService from '../../services/stats.service';
import PageLoader from '../elements/page.loader';
import BadgeMedal from './badge.medal';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

const formatNumber = (value) => new Intl.NumberFormat().format(value);

const weeks = (count) => `${count} ${count === 1 ? 'week' : 'weeks'}`;

/**
 * Weeks played in a row: the running streak and the best one so far.
 */
const WeekStreak = ({ streak, compact = false }) => {
    if (!streak) return null;
    if (streak.best === 0) return <span className={`text-faint ${compact ? 'fs-8' : 'fs-7'}`}>Not played yet</span>;
    return (
        <span className={`d-flex flex-wrap align-items-center column-gap-3 ${compact ? 'fs-8' : 'fs-7'}`}>
            <span className={streak.current > 0 ? 'text-default' : 'text-faint'}>
                <FaFire className={`me-1 ${streak.current > 0 ? 'text-orange' : ''}`} aria-hidden="true" />
                {streak.current > 0 ? `${weeks(streak.current)} in a row` : 'No current streak'}
            </span>
            <span className="text-faint">Best: {weeks(streak.best)}</span>
        </span>
    );
};

/**
 * Badge overview of the club: every player with their badge count.
 */
const BadgesOverview = () => {
    const [overview, setOverview] = useState(null);

    useEffect(() => {
        StatsService.loadClubBadges().then(setOverview).catch(error => console.error('Failed to load badges', error));
    }, []);

    if (!overview) return <PageLoader />;

    return (
        <Panel header="Badges">
            <div className="container-fluid overflow-hidden">
                <p className="text-subtle p-3 pb-0 m-0">
                    Players collect badges for what they achieve in games and trainings. Pick a player to see their collection.
                </p>
                <div className="row gy-4 p-3">
                    {overview.players.length === 0 && <span className="text-subtle">This club has no players yet.</span>}
                    {overview.players.map(player => (
                        <div className="col-12 col-md-6 col-xl-4" key={player.id}>
                            <Link to={`/badges/${player.id}`} className="badge-player-card bg-surface-raised rounded-2 p-3 d-flex align-items-center gap-3 h-100">
                                <Avatar
                                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                                    image={resolvePlayerImg(player.profileImg)}
                                    shape="circle"
                                    className="avatar-md bg-surface-high"
                                />
                                <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                                    <span className="text-default fw-semibold text-break">{player.nickname}</span>
                                    <span className="text-subtle fs-7">{player.earnedCount} of {overview.total} badges</span>
                                    <WeekStreak streak={player.weekStreak} compact />
                                </div>
                                <span className="d-flex gap-1 flex-shrink-0">
                                    {player.latest.map(badge => <BadgeMedal key={badge.id} badge={badge} size="sm" />)}
                                </span>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </Panel>
    );
};

/**
 * One series of badges (e.g. 180s): its tiers side by side, and what is
 * needed for the next one.
 */
const BadgeSeries = ({ badges }) => {
    const next = badges.find(badge => !badge.earned);
    const earnedCount = badges.filter(badge => badge.earned).length;

    return (
        <li className="badge-series">
            <div className="badge-series-info">
                <span className="text-default fw-semibold">{badges[0].groupTitle}</span>
                {badges.length === 1
                    ? (
                        <span className="text-faint fs-7">{badges[0].description}</span>
                    )
                    : next
                    ? (
                        <>
                            <span className="text-faint fs-7">Next: {next.title} · {next.description}</span>
                            {next.target > 1 &&
                                <div className="d-flex align-items-center gap-2">
                                    <ProgressBar value={Math.round(next.progress / next.target * 100)} showValue={false} className="flex-grow-1" style={{ height: '0.35rem', maxWidth: '16rem' }} />
                                    <span className="text-faint fs-8" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(next.progress)} / {formatNumber(next.target)}</span>
                                </div>
                            }
                        </>
                    )
                    : <span className="text-subtle fs-7">{earnedCount === 1 ? 'Earned' : 'Complete'}</span>
                }
            </div>
            <ul className="badge-series-tiers list-unstyled m-0">
                {badges.map(badge => (
                    <li key={badge.id} className="badge-tier" title={`${badge.title}: ${badge.description}`}>
                        <BadgeMedal badge={badge} locked={!badge.earned} />
                        <span className={`badge-tier-name fs-8 ${badge.earned ? 'text-default' : 'text-faint'}`}>{badge.title}</span>
                    </li>
                ))}
            </ul>
        </li>
    );
};

/**
 * One player's collection, by category and series.
 */
const PlayerBadges = ({ playerId }) => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setData(null);
        StatsService.loadPlayerBadges(playerId).then(setData).catch(() => setFailed(true));
    }, [playerId]);

    if (failed) return <div className="text-subtle">This player could not be found in the selected club. <Link to="/badges">All players</Link></div>;
    if (!data) return <PageLoader />;

    const { player } = data;
    // category -> series -> badges, in catalogue order
    const categories = data.categories.map(({ category, title }) => {
        const series = [];
        for (const badge of data.badges.filter(b => b.category === category)) {
            if (series.at(-1)?.[0].group !== badge.group) series.push([]);
            series.at(-1).push(badge);
        }
        const badges = series.flat();
        return { category, title, series, earned: badges.filter(b => b.earned).length, total: badges.length };
    });

    return (
        <>
            <header className="bg-surface-translucent rounded-2 p-4 mb-4 d-flex flex-wrap align-items-center gap-4">
                <Avatar
                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                    image={resolvePlayerImg(player.profileImg)}
                    shape="circle"
                    className="avatar-lg bg-surface-high"
                />
                <div className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                    <h1 className="fs-2 fw-semibold text-default m-0 text-break">{player.nickname}</h1>
                    <span className="text-subtle">{data.earnedCount} of {data.total} badges collected</span>
                    <WeekStreak streak={data.weekStreak} />
                    <ProgressBar value={Math.round(data.earnedCount / data.total * 100)} showValue={false} style={{ height: '0.5rem', maxWidth: '24rem' }} />
                </div>
                <Link to="/badges" className="fs-7">All players</Link>
            </header>

            <div className="d-flex flex-column gap-4">
                {categories.map(category => (
                    <Panel key={category.category} header={`${category.title} · ${category.earned} / ${category.total}`}>
                        <ul className="list-unstyled m-0 d-flex flex-column">
                            {category.series.map(badges => <BadgeSeries key={badges[0].group} badges={badges} />)}
                        </ul>
                    </Panel>
                ))}
            </div>
        </>
    );
};

const BadgesPage = () => {
    const { id } = useParams();

    return (
        <div className="container-fluid p-4 border-0">
            {id ? <PlayerBadges playerId={id} /> : <BadgesOverview />}
        </div>
    );
};

export default BadgesPage;
