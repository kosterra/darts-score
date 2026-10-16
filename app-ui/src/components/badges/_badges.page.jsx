import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { FaFire } from "react-icons/fa6";

import StatsService from '../../services/stats.service';
import PageLoader from '../elements/page.loader';
import BadgeMedal from './badge.medal';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

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
                    Players collect badges for what they achieve in games and trainings. Pick a player to see their profile with the whole collection.
                </p>
                <div className="row gy-4 p-3">
                    {overview.players.length === 0 && <span className="text-subtle">This club has no players yet.</span>}
                    {overview.players.map(player => (
                        <div className="col-12 col-md-6 col-xl-4" key={player.id}>
                            <Link to={`/players/${player.id}#badges`} className="badge-player-card bg-surface-raised rounded-2 p-3 d-flex align-items-center gap-3 h-100">
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
