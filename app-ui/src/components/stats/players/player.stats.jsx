import { useEffect, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { FaFire, FaBullseye, FaTrophy, FaStopwatch, FaFlagCheckered, FaHashtag, FaCrosshairs, FaBolt } from "react-icons/fa6";
import { GiDart } from "react-icons/gi";
import dayjs from 'dayjs';

import StatsService from '../../../services/stats.service';
import PageLoader from '../../elements/page.loader';
import BadgeMedal from '../../badges/badge.medal';
import PlayerStatsCharts from './player.stats.charts';
import { KpiRing, KpiHero, KpiChip } from './kpi';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const LATEST_BADGES = 5;

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);
const percent = (part, whole) => whole ? `${Math.round(part * 100 / whole)} %` : '–';
const weeks = (count) => `${count} ${count === 1 ? 'week' : 'weeks'}`;

// the colours of the game type tags
const COLORS = { x01: '#7ecca5', cricket: '#d4c783', elimination: '#c3a9e6' };

// the badge collection further down the profile page
const scrollToBadges = (event) => {
    const target = document.getElementById('badges');
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', '#badges');
};

/**
 * A player's profile in the selected club: who they are, how they are doing
 * (games, wins, streak, badges) and their detailed statistics. "afterFigures"
 * is shown between the key figures and the charts.
 */
const PlayerStats = ({ player, isOwn = false, afterFigures = null }) => {
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
    const games = playedGames.total ?? 0;
    const wins = wonGames.total ?? 0;
    const kpis = stats.kpis ?? {};
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
        ['Badges', badges ? <a href="#badges" onClick={scrollToBadges}>{badges.earnedCount} of {badges.total}</a> : '–'],
    ];

    const x01 = kpis.x01 ?? {};
    const cricket = kpis.cricket ?? {};
    const elimination = kpis.elimination ?? {};
    const twoDigits = (value) => value == null ? null : value.toFixed(2);

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
                        <a href="#badges" onClick={scrollToBadges} className="d-flex gap-2" aria-label={`All badges of ${player.nickname}`}>
                            {latestBadges.map(badge => <BadgeMedal key={badge.id} badge={badge} size="sm" />)}
                        </a>
                    </div>
                }
            </header>

            {games === 0
                ? (
                    <div className="d-flex flex-column gap-4">
                        <p className="text-subtle m-0">{player.nickname} has not finished a game yet. Statistics appear here after the first game.</p>
                        {afterFigures}
                    </div>
                )
                : (
                    <div className="d-flex flex-column gap-4">
                        {playedGames.x01 > 0 &&
                            <Panel header="X01">
                                <div className="kpi-headline mb-4">
                                    <KpiRing label="Win rate" part={wonGames.x01} whole={playedGames.x01} color={COLORS.x01} detail={`${formatNumber(wonGames.x01)} of ${formatNumber(playedGames.x01)} games`} />
                                    <KpiHero label="3-dart average" value={avg.overallX01} color={COLORS.x01} />
                                    <KpiHero label="First 9 average" value={x01.firstNineAverage} color={COLORS.x01} />
                                    <KpiRing label="Checkout rate" part={checkouts.hit} whole={checkouts.total} color={COLORS.x01} detail={`${formatNumber(checkouts.hit)} of ${formatNumber(checkouts.total)} attempts`} />
                                </div>
                                <div className="kpi-chips">
                                    <KpiChip icon={FaFlagCheckered} label="Legs won" value={formatNumber(x01.legsWon)} color={COLORS.x01} />
                                    <KpiChip icon={FaFire} label="180s" value={formatNumber(stats.num180s)} color={COLORS.x01} />
                                    <KpiChip icon={FaBolt} label="140+" value={formatNumber(stats.num140plus)} color={COLORS.x01} />
                                    <KpiChip icon={FaHashtag} label="100+ visits" value={formatNumber(x01.tonPlus)} color={COLORS.x01} />
                                    <KpiChip icon={FaCrosshairs} label="Highest checkout" value={checkouts.highest || null} color={COLORS.x01} />
                                    <KpiChip icon={FaStopwatch} label="Best 501 leg" value={x01.bestLeg ? `${x01.bestLeg} darts` : null} color={COLORS.x01} />
                                    <KpiChip icon={GiDart} label="Darts per leg" value={avg.dartsPerLegX01 || null} color={COLORS.x01} />
                                    <KpiChip icon={FaBullseye} label="Darts thrown" value={formatNumber(throwedDarts.x01)} color={COLORS.x01} />
                                    <KpiChip icon={FaTrophy} label="Points scored" value={formatNumber(throwedPoints.x01)} color={COLORS.x01} />
                                </div>
                            </Panel>
                        }
                        <div className="row g-4">
                            <div className="col-12 col-xl-6">
                                <Panel header="Cricket" className="h-100">
                                    {playedGames.cricket > 0
                                        ? (
                                            <>
                                                <div className="kpi-headline mb-4">
                                                    <KpiRing label="Win rate" part={wonGames.cricket} whole={playedGames.cricket} color={COLORS.cricket} detail={`${formatNumber(wonGames.cricket)} of ${formatNumber(playedGames.cricket)} games`} />
                                                    <KpiHero label="Marks per round" value={twoDigits(cricket.marksPerRound)} color={COLORS.cricket} />
                                                </div>
                                                <div className="kpi-chips">
                                                    <KpiChip icon={FaFire} label="Best game" value={twoDigits(cricket.bestMarksPerRound)} color={COLORS.cricket} />
                                                    <KpiChip icon={FaTrophy} label="Points per game" value={cricket.averagePoints} color={COLORS.cricket} />
                                                </div>
                                            </>
                                        )
                                        : <p className="text-subtle m-0">No finished Cricket games yet.</p>
                                    }
                                </Panel>
                            </div>
                            <div className="col-12 col-xl-6">
                                <Panel header="Elimination" className="h-100">
                                    {elimination.games > 0
                                        ? (
                                            <>
                                                <div className="kpi-headline mb-4">
                                                    <KpiRing label="Win rate" part={elimination.wins} whole={elimination.games} color={COLORS.elimination} detail={`${formatNumber(elimination.wins)} of ${formatNumber(elimination.games)} games`} />
                                                    <KpiHero label="Average per visit" value={elimination.averageVisit} color={COLORS.elimination} />
                                                </div>
                                                <div className="kpi-chips">
                                                    <KpiChip icon={FaFire} label="Best visit" value={elimination.bestVisit} color={COLORS.elimination} />
                                                    <KpiChip icon={FaBullseye} label="Darts thrown" value={formatNumber(elimination.dartsThrown)} color={COLORS.elimination} />
                                                </div>
                                            </>
                                        )
                                        : <p className="text-subtle m-0">No finished Elimination games yet.</p>
                                    }
                                </Panel>
                            </div>
                        </div>
                        {afterFigures}
                        <PlayerStatsCharts playerStats={stats} players={[player]} />
                    </div>
                )
            }
        </>
    );
};

export default PlayerStats;
