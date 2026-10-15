import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { FaFire } from "react-icons/fa6";
import dayjs from 'dayjs';

import StatsService from '../../../services/stats.service';
import PageLoader from '../../elements/page.loader';
import BadgeMedal from '../../badges/badge.medal';
import PlayerStatsCharts from './player.stats.charts';
import StatTile from './stat.tile';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const LATEST_BADGES = 5;

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);
const percent = (part, whole) => whole ? `${Math.round(part * 100 / whole)} %` : '–';
const weeks = (count) => `${count} ${count === 1 ? 'week' : 'weeks'}`;

/**
 * A player's profile in the selected club: who they are, how they are doing
 * (games, wins, streak, badges) and their detailed statistics.
 */
const PlayerStats = ({ player, isOwn = false }) => {
    const [stats, setStats] = useState(null);
    const [badges, setBadges] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            StatsService.loadPlayerStats(player.id).catch(() => null),
            StatsService.loadPlayerBadges(player.id).catch(() => null),
        ]).then(([loadedStats, loadedBadges]) => {
            if (cancelled) return;
            setStats(loadedStats ?? {});
            setBadges(loadedBadges);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [player.id]);

    if (loading) return <PageLoader />;

    const { playedGames = {}, wonGames = {}, avg = {}, checkouts = {}, throwedDarts = {}, throwedPoints = {} } = stats;
    const games = (playedGames.x01 ?? 0) + (playedGames.cricket ?? 0);
    const wins = (wonGames.x01 ?? 0) + (wonGames.cricket ?? 0);
    const streak = badges?.weekStreak ?? { current: 0, best: 0 };
    const latestBadges = (badges?.badges ?? [])
        .filter(badge => badge.earned)
        .sort((a, b) => new Date(b.earned.earnedAt) - new Date(a.earned.earnedAt))
        .slice(0, LATEST_BADGES);

    const facts = [
        ['Member since', dayjs(player.createdAt).format('DD.MM.YYYY')],
        ['Games played', formatNumber(games)],
        ['Wins', games ? `${formatNumber(wins)} (${percent(wins, games)})` : '–'],
        ['Weekly streak', streak.current > 0
            ? <span><FaFire className="text-orange me-1" aria-hidden="true" />{weeks(streak.current)}</span>
            : 'None right now'],
        ['Best streak', weeks(streak.best)],
        ['Badges', badges ? <Link to={`/badges/${player.id}`}>{badges.earnedCount} of {badges.total}</Link> : '–'],
    ];

    const x01Tiles = [
        ['Games', formatNumber(playedGames.x01)],
        ['Wins', formatNumber(wonGames.x01), percent(wonGames.x01, playedGames.x01)],
        ['Average', avg.overallX01 ?? '–'],
        ['Darts per leg', avg.dartsPerLegX01 ?? '–'],
        ['180s', formatNumber(stats.num180s)],
        ['140+', formatNumber(stats.num140plus)],
        ['Checkout rate', percent(checkouts.hit, checkouts.total), `${formatNumber(checkouts.hit)} of ${formatNumber(checkouts.total)}`],
        ['Highest checkout', checkouts.highest || '–'],
        ['Darts thrown', formatNumber(throwedDarts.x01)],
        ['Points scored', formatNumber(throwedPoints.x01)],
    ];

    const cricketTiles = [
        ['Games', formatNumber(playedGames.cricket)],
        ['Wins', formatNumber(wonGames.cricket), percent(wonGames.cricket, playedGames.cricket)],
    ];

    return (
        <>
            <header className="bg-surface-translucent rounded-2 p-4 mb-4 d-flex flex-wrap align-items-start gap-4">
                <Avatar
                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                    image={resolvePlayerImg(player.profileImg)}
                    shape="circle"
                    className="avatar-xl bg-surface-high"
                />
                <div className="d-flex flex-column gap-3" style={{ minWidth: 0, flex: '1 1 20rem' }}>
                    <div>
                        <h1 className="fs-2 fw-semibold text-default m-0 text-break">
                            {player.nickname}{isOwn && <span className="text-faint fs-5 fw-normal"> (you)</span>}
                        </h1>
                        <span className="text-subtle">{player.firstname} {player.lastname}</span>
                    </div>
                    <dl className="d-flex flex-wrap column-gap-5 row-gap-2 m-0">
                        {facts.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-faint fs-8 fw-normal">{label}</dt>
                                <dd className="text-default fw-semibold m-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                {latestBadges.length > 0 &&
                    <div className="d-flex flex-column gap-2">
                        <span className="text-faint fs-8">Latest badges</span>
                        <Link to={`/badges/${player.id}`} className="d-flex gap-2" aria-label={`All badges of ${player.nickname}`}>
                            {latestBadges.map(badge => <BadgeMedal key={badge.id} badge={badge} size="sm" />)}
                        </Link>
                    </div>
                }
            </header>

            {games === 0
                ? <p className="text-subtle">{player.nickname} has not finished a game yet. Statistics appear here after the first game.</p>
                : (
                    <div className="d-flex flex-column gap-4">
                        <Panel header="X01">
                            <div className="row g-3">
                                {x01Tiles.map(([label, value, detail]) => (
                                    <div className="col-6 col-md-4 col-xl" key={label} style={{ minWidth: '9rem' }}>
                                        <StatTile label={label} value={value} detail={detail} />
                                    </div>
                                ))}
                            </div>
                        </Panel>
                        <Panel header="Cricket">
                            <div className="row g-3">
                                {cricketTiles.map(([label, value, detail]) => (
                                    <div className="col-6 col-md-4 col-xl-2" key={label}>
                                        <StatTile label={label} value={value} detail={detail} />
                                    </div>
                                ))}
                            </div>
                        </Panel>
                        <PlayerStatsCharts playerStats={stats} players={[player]} />
                    </div>
                )
            }
        </>
    );
};

export default PlayerStats;
