import { Panel } from 'primereact/panel';
import { FaFire, FaCrosshairs, FaStopwatch, FaFlagCheckered, FaBullseye, FaUsers, FaCalendarCheck, FaPlay } from 'react-icons/fa6';
import { FaArrowTrendUp, FaArrowTrendDown } from 'react-icons/fa6';
import { MdSportsCricket } from 'react-icons/md';
import { BiTargetLock } from 'react-icons/bi';
import { GiDart } from 'react-icons/gi';

import { KpiRing, KpiHero, KpiChip } from '../../stats/players/kpi';

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);
const GREEN = '#7ecca5';
const TYPE_COLORS = { x01: '#7ecca5', cricket: '#d4c783', elimination: '#c3a9e6' };

/**
 * The club in numbers: rates as rings, the average and this month's games as
 * big numbers, and counts and club records as chips.
 */
const ClubKpisWidget = ({ widget, kpis, totals, players }) => {
    const nameOf = (id) => players.get(id)?.nickname ?? 'Unknown';
    const monthTrend = kpis.gamesThisMonth - kpis.gamesLastMonth;
    const TrendIcon = monthTrend >= 0 ? FaArrowTrendUp : FaArrowTrendDown;

    return (
        <Panel header={widget.title}>
            <div className="kpi-headline mb-4">
                <KpiRing label="Games finished" part={kpis.gamesFinished} whole={kpis.gamesStarted} color={GREEN} detail={`${formatNumber(kpis.gamesFinished)} of ${formatNumber(kpis.gamesStarted)} started`} />
                <KpiHero label="Club X01 average" value={kpis.x01Average} color={GREEN} />
                <KpiHero
                    label="Games this month"
                    value={formatNumber(kpis.gamesThisMonth)}
                    color={GREEN}
                    detail={(
                        <span className={monthTrend >= 0 ? 'text-success' : 'text-subtle'}>
                            <TrendIcon className="me-1" aria-hidden="true" />
                            {monthTrend === 0 ? 'as many as' : `${Math.abs(monthTrend)} ${monthTrend > 0 ? 'more' : 'fewer'} than`} last month
                        </span>
                    )}
                />
                <KpiRing label="Checkout rate" part={kpis.checkoutHit} whole={kpis.checkoutTotal} color={GREEN} detail={`${formatNumber(kpis.checkoutHit)} of ${formatNumber(kpis.checkoutTotal)} attempts`} />
            </div>
            <div className="kpi-chips">
                <KpiChip icon={FaBullseye} label="X01 games" value={formatNumber(totals.x01)} color={TYPE_COLORS.x01} />
                <KpiChip icon={MdSportsCricket} label="Cricket games" value={formatNumber(totals.cricket)} color={TYPE_COLORS.cricket} />
                <KpiChip icon={BiTargetLock} label="Elimination games" value={formatNumber(totals.elimination)} color={TYPE_COLORS.elimination} />
                <KpiChip icon={FaPlay} label="Running now" value={formatNumber(totals.running)} color={GREEN} />
                <KpiChip icon={FaUsers} label="Active this month" value={`${formatNumber(kpis.activePlayersThisMonth)} players`} color={GREEN} />
                <KpiChip icon={FaFire} label="180s" value={formatNumber(kpis.num180s)} color={GREEN} />
                <KpiChip icon={FaCrosshairs} label={kpis.highestCheckout ? `Highest checkout · ${nameOf(kpis.highestCheckout.player)}` : 'Highest checkout'} value={kpis.highestCheckout?.value} color={GREEN} />
                <KpiChip icon={FaStopwatch} label={kpis.bestLeg ? `Best 501 leg · ${nameOf(kpis.bestLeg.player)}` : 'Best 501 leg'} value={kpis.bestLeg ? `${kpis.bestLeg.value} darts` : null} color={GREEN} />
                <KpiChip icon={FaFlagCheckered} label="Legs played" value={formatNumber(kpis.legsPlayed)} color={GREEN} />
                <KpiChip icon={GiDart} label="Darts thrown" value={formatNumber(kpis.dartsThrown)} color={GREEN} />
                <KpiChip icon={FaCalendarCheck} label={kpis.longestStreak ? `Longest weekly streak · ${nameOf(kpis.longestStreak.player)}` : 'Longest weekly streak'} value={kpis.longestStreak ? `${kpis.longestStreak.value} weeks` : null} color={GREEN} />
            </div>
        </Panel>
    );
};

export default ClubKpisWidget;
