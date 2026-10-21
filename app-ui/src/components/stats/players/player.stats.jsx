import { useEffect, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { FaFire, FaBullseye, FaTrophy, FaStopwatch, FaFlagCheckered, FaHashtag, FaCrosshairs, FaBolt } from "react-icons/fa6";
import { GiDart } from "react-icons/gi";
import dayjs from 'dayjs';
import { DartSet } from '../../players/dart.side';
import { flightOf } from '../../../utils/flights';

import StatsService from '../../../services/stats.service';
import { PlayerStatsSkeleton } from '../../elements/skeletons';
import BadgeMedal from '../../badges/badge.medal';
import ShameMedal from '../../badges/shame.medal';
import PlayerStatsCharts from './player.stats.charts';
import ComparisonFilters, { FilterPanel } from './comparison.filters';
import FormBadge from './form.badge';
import FormFigures from './form.figures';
import { describeFilters } from './filter.summary';
import { KpiRing, KpiHero, KpiChip } from './kpi';
import PlayerLevel from '../../players/player.level';
import { averageLevelOf } from '../../../utils/average.levels';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const LATEST_BADGES = 5;

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);
const percent = (part, whole) => whole ? `${Math.round(part * 100 / whole)} %` : '–';
const weeks = (count) => `${count} ${count === 1 ? 'week' : 'weeks'}`;

const STREAK_FLAMES = 5;

// the profile opens with the selected club's games
const DEFAULT_FILTERS = {
    scope: 'club',
    period: 'All',
    range: null,
    lastGames: 'All',
    startingScore: 'All',
    format: 'all',
};

const formatLabel = ({ setMode, numberOfSets, legMode, numberOfLegs }) =>
    `${setMode} ${numberOfSets} ${numberOfSets === 1 ? 'set' : 'sets'} · ${legMode} ${numberOfLegs} ${numberOfLegs === 1 ? 'leg' : 'legs'}`;

/**
 * What the server is asked for, from the filters above the statistics.
 */
const requestOf = (filters, formats) => {
    const [from, to] = filters.range ?? [];
    const day = (date) => date ? dayjs(date).format('YYYY-MM-DD') : undefined;
    const format = formats.find(entry => entry.value === filters.format)?.format;
    return {
        scope: filters.scope,
        period: filters.period,
        ...(filters.period === 'Custom' && { from: day(from), to: day(to ?? from) }),
        ...(filters.lastGames !== 'All' && { lastGames: filters.lastGames }),
        ...(filters.startingScore !== 'All' && { startingScore: filters.startingScore }),
        ...format,
    };
};

const isFiltered = (filters) => Object.entries(DEFAULT_FILTERS).some(([key, value]) => key !== 'range' && filters[key] !== value);

/**
 * The weekly streak as five flames: one lit per week in a row, the rest grey
 * until they are reached. From five weeks on all five burn.
 */
const StreakFlames = ({ weeks: count }) => (
    <span className="streak-flames" aria-hidden="true">
        {Array.from({ length: STREAK_FLAMES }, (_, index) => (
            <FaFire key={index} className={index < count ? 'is-lit' : ''} />
        ))}
    </span>
);

// the colours of the game type tags
const COLORS = { x01: '#7ecca5', cricket: '#d4c783', elimination: '#c3a9e6', clock: '#86bfe6' };

// a part further down the profile page: the badge collection or the Hall of Shame
const scrollTo = (id) => (event) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
};
const scrollToBadges = scrollTo('badges');
const scrollToShame = scrollTo('hall-of-shame');

/**
 * A player's profile: who they are, how they are doing (games, wins, streak,
 * badges) and their detailed statistics, filtered by clubs, period, last games
 * and X01 starting score and format. Level, badges and streak always count
 * everything. "afterFigures" is shown between the key figures and the charts.
 */
const PlayerStats = ({ player, isOwn = false, afterFigures = null }) => {
    const [stats, setStats] = useState(null);
    const [badges, setBadges] = useState(null);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    // reloading for other filters keeps the page and dims it
    const [refreshing, setRefreshing] = useState(false);

    // the X01 formats the player has played, from the last answer
    const formats = (stats?.filterOptions?.formats ?? []).map(format => ({ label: formatLabel(format), value: formatLabel(format), format }));
    const playsInSeveralClubs = (player.clubs?.length ?? 0) > 1;
    // a date range only counts once its first day is chosen
    const request = requestOf(filters, formats);
    const requestKey = filters.period === 'Custom' && !filters.range?.[0] ? null : JSON.stringify(request);

    useEffect(() => {
        StatsService.loadPlayerBadges(player.id).then(setBadges).catch(() => setBadges(null));
    }, [player.id]);

    // the form: the latest X01 games in this club against the ones before, whatever the filters
    const [form, setForm] = useState(null);
    useEffect(() => {
        StatsService.loadPlayersForm([player.id]).then(forms => setForm(forms?.[player.id] ?? null)).catch(() => setForm(null));
    }, [player.id]);

    useEffect(() => {
        if (requestKey === null) return undefined;
        let cancelled = false;
        setRefreshing(true);
        StatsService.loadPlayerStats(player.id, JSON.parse(requestKey))
            .catch(() => ({}))
            .then(loaded => {
                if (cancelled) return;
                setStats(loaded);
                setRefreshing(false);
            });
        return () => { cancelled = true; };
    }, [player.id, requestKey]);

    if (!stats) return <PlayerStatsSkeleton />;

    const { playedGames = {}, wonGames = {}, avg = {}, checkouts = {}, throwedDarts = {}, throwedPoints = {} } = stats;
    const games = playedGames.total ?? 0;
    const wins = wonGames.total ?? 0;
    const kpis = stats.kpis ?? {};
    const streak = badges?.weekStreak ?? { current: 0, best: 0 };
    const shame = badges?.shame ?? [];
    const heldShame = shame.filter(badge => badge.active);
    const latestBadges = (badges?.badges ?? [])
        .filter(badge => badge.earned)
        .sort((a, b) => new Date(b.earned.earnedAt) - new Date(a.earned.earnedAt))
        .slice(0, LATEST_BADGES);

    const facts = [
        ['Member since', dayjs(player.createdAt).format('DD.MM.YYYY')],
        ['Games played', formatNumber(games)],
        ['Wins', games ? `${formatNumber(wins)} (${percent(wins, games)})` : '–'],
        ['Weekly streak', (
            <span key="streak" className="d-inline-flex align-items-center gap-2">
                <StreakFlames weeks={streak.current} />
                {streak.current > 0 ? weeks(streak.current) : 'None right now'}
            </span>
        )],
        ['Best streak', weeks(streak.best)],
        ['Badges', badges ? <a href="#badges" onClick={scrollToBadges}>{badges.earnedCount} of {badges.total}</a> : '–'],
    ];

    const x01 = kpis.x01 ?? {};
    const cricket = kpis.cricket ?? {};
    const elimination = kpis.elimination ?? {};
    const clock = kpis.clock ?? {};
    const twoDigits = (value) => value == null ? null : value.toFixed(2);

    return (
        <>
            <header className="hero-header rounded-2 p-4 mb-4 d-flex flex-wrap align-items-start gap-4">
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
                    <PlayerLevel level={stats.level} />
                    <dl className="d-flex flex-wrap column-gap-5 row-gap-2 m-0">
                        {facts.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-faint fs-8 fw-normal">{label}</dt>
                                <dd className="text-default fw-semibold m-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                {/* the darts they throw with */}
                <div className="player-hero-dart d-flex flex-column gap-2">
                    <span className="text-faint fs-8">{isOwn ? 'Your darts' : 'Their darts'}</span>
                    <DartSet {...flightOf(player)} />
                </div>
                {(latestBadges.length > 0 || shame.length > 0) &&
                    <div className="d-flex flex-column gap-3">
                        {latestBadges.length > 0 &&
                            <div className="d-flex flex-column gap-2">
                                <span className="text-faint fs-8">Latest badges</span>
                                <a href="#badges" onClick={scrollToBadges} className="d-flex gap-2" aria-label={`All badges of ${player.nickname}`}>
                                    {latestBadges.map(badge => <BadgeMedal key={badge.id} badge={badge} size="sm" />)}
                                </a>
                            </div>
                        }
                        {/* the badges nobody wants, held right now; only where the club has a Hall of Shame for this player */}
                        {shame.length > 0 &&
                            <div className="d-flex flex-column gap-2">
                                <span className="text-faint fs-8">Hall of Shame</span>
                                <a href="#hall-of-shame" onClick={scrollToShame} className="d-flex align-items-center gap-2" aria-label={`Hall of Shame of ${player.nickname}`}>
                                    {heldShame.length > 0
                                        ? heldShame.map(badge => <ShameMedal key={badge.id} badge={badge} size="sm" />)
                                        : <span className="fs-7 fw-semibold">Clean slate</span>}
                                </a>
                            </div>
                        }
                    </div>
                }
                <div className="w-100">
                    <FilterPanel {...describeFilters(filters, DEFAULT_FILTERS, { formats, withType: false, withOthers: false, withScope: true })}>
                        <ComparisonFilters
                            filters={filters}
                            onChange={setFilters}
                            formats={formats}
                            withType={false}
                            withOthers={false}
                            withScope
                            scopeHint={playsInSeveralClubs ? null : `${player.nickname} plays only in this club, so both show the same games.`}
                            lastGamesLabel="Last games"
                        />
                    </FilterPanel>
                </div>
            </header>

            {games === 0
                ? (
                    <div className="d-flex flex-column gap-4">
                        <p className="text-subtle m-0">
                            {isFiltered(filters)
                                ? <>No finished games match these filters. <Button label="Show all games" link className="p-0 align-baseline" onClick={() => setFilters(DEFAULT_FILTERS)} /></>
                                : `${player.nickname} has not finished a game yet. Statistics appear here after the first game.`}
                        </p>
                        {afterFigures}
                    </div>
                )
                : (
                    <div className={`d-flex flex-column gap-4 ${refreshing ? 'is-refreshing' : ''}`}>
                        {form?.figures?.recent?.games > 0 &&
                            <Panel header="Form">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                                    <span className="text-subtle fs-7">
                                        The last {form.figures.recent.games} X01 games in this club{form.figures.previous ? `, against the ${form.figures.previous.games} before` : ''}.
                                    </span>
                                    <FormBadge form={form} color={COLORS.x01} />
                                </div>
                                <FormFigures form={form} />
                            </Panel>
                        }
                        {playedGames.x01 > 0 &&
                            <Panel header="X01">
                                <div className="kpi-headline mb-4">
                                    <KpiRing label="Win rate" part={wonGames.x01} whole={playedGames.x01} color={COLORS.x01} detail={`${formatNumber(wonGames.x01)} of ${formatNumber(playedGames.x01)} games`} />
                                    <KpiHero
                                        label="3-dart average"
                                        value={avg.overallX01}
                                        color={COLORS.x01}
                                        detail={averageLevelOf(avg.overallX01) && avg.overallX01 > 0 && (
                                            <span style={{ color: averageLevelOf(avg.overallX01).color, fontWeight: 700 }}>{averageLevelOf(avg.overallX01).name}</span>
                                        )}
                                    />
                                    <KpiHero label="First 9 average" value={x01.firstNineAverage} color={COLORS.x01} />
                                    <KpiRing label="Checkout rate" part={checkouts.hit} whole={checkouts.total} color={COLORS.x01} detail={`${formatNumber(checkouts.hit)} of ${formatNumber(checkouts.total)} attempts`} />
                                </div>
                                {/* the game in figures, then how often each score range was thrown */}
                                <div className="kpi-chips">
                                    <KpiChip icon={FaFlagCheckered} label="Legs won" value={formatNumber(x01.legsWon)} color={COLORS.x01} />
                                    <KpiChip icon={FaCrosshairs} label="Highest checkout" value={checkouts.highest || null} color={COLORS.x01} />
                                    <KpiChip icon={FaStopwatch} label="Best 501 leg" value={x01.bestLeg ? `${x01.bestLeg} darts` : null} color={COLORS.x01} />
                                    <KpiChip icon={GiDart} label="Darts per leg" value={avg.dartsPerLegX01 || null} color={COLORS.x01} />
                                    <KpiChip icon={FaBullseye} label="Darts thrown" value={formatNumber(throwedDarts.x01)} color={COLORS.x01} />
                                    <KpiChip icon={FaTrophy} label="Points scored" value={formatNumber(throwedPoints.x01)} color={COLORS.x01} />
                                </div>
                                <div className="kpi-chips mt-3">
                                    <KpiChip icon={FaFire} label="180s" value={formatNumber(stats.num180s)} color={COLORS.x01} />
                                    <KpiChip icon={FaBolt} label="160+" value={formatNumber(stats.num160plus)} color={COLORS.x01} />
                                    <KpiChip icon={FaBolt} label="140+" value={formatNumber(stats.num140plus)} color={COLORS.x01} />
                                    <KpiChip icon={FaHashtag} label="120+" value={formatNumber(stats.num120plus)} color={COLORS.x01} />
                                    <KpiChip icon={FaHashtag} label="100+" value={formatNumber(stats.num100plus)} color={COLORS.x01} />
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
                            <div className="col-12 col-xl-6">
                                <Panel header="Around the Clock" className="h-100">
                                    {clock.games > 0
                                        ? (
                                            <>
                                                <div className="kpi-headline mb-4">
                                                    <KpiRing label="Win rate" part={clock.wins} whole={clock.games} color={COLORS.clock} detail={`${formatNumber(clock.wins)} of ${formatNumber(clock.games)} games`} />
                                                    <KpiHero label="Hit rate" value={clock.hitRate == null ? null : `${clock.hitRate} %`} color={COLORS.clock} />
                                                </div>
                                                <div className="kpi-chips">
                                                    <KpiChip icon={FaStopwatch} label="Fewest darts" value={clock.fewestDarts ? `${clock.fewestDarts} darts` : null} color={COLORS.clock} />
                                                    <KpiChip icon={GiDart} label="Darts per game" value={clock.averageDarts} color={COLORS.clock} />
                                                    <KpiChip icon={FaBullseye} label="Darts thrown" value={formatNumber(clock.dartsThrown)} color={COLORS.clock} />
                                                </div>
                                            </>
                                        )
                                        : <p className="text-subtle m-0">No finished Around the Clock games yet.</p>
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
