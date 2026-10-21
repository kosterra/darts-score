import { Panel } from 'primereact/panel';
import { FaFire, FaCrosshairs, FaStopwatch, FaFlagCheckered, FaBullseye, FaUsers, FaCalendarCheck, FaPlay } from 'react-icons/fa6';
import { FaArrowTrendUp, FaArrowTrendDown } from 'react-icons/fa6';
import { MdSportsCricket } from 'react-icons/md';
import { BiTargetLock } from 'react-icons/bi';
import { PiClockClockwiseBold } from 'react-icons/pi';
import { GiDart } from 'react-icons/gi';

import { KpiRing, KpiHero, KpiChip } from '../../stats/players/kpi';
import { locale, t } from '../../../utils/i18n';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);
const GREEN = '#7ecca5';
const TYPE_COLORS = { x01: '#7ecca5', cricket: '#d4c783', elimination: '#c3a9e6', clock: '#86bfe6' };

/**
 * The club in numbers: rates as rings, the average and this month's games as
 * big numbers, and counts and club records as chips.
 */
const ClubKpisWidget = ({ widget, kpis, totals, players }) => {
    const nameOf = (id) => players.get(id)?.nickname ?? t('Unknown');
    const monthTrend = kpis.gamesThisMonth - kpis.gamesLastMonth;
    const TrendIcon = monthTrend >= 0 ? FaArrowTrendUp : FaArrowTrendDown;

    return (
        <Panel header={widget.title}>
            <div className="kpi-headline mb-4">
                <KpiRing label={t('Games finished')} part={kpis.gamesFinished} whole={kpis.gamesStarted} color={GREEN} detail={t('{{formatNumber}} of {{formatNumber2}} started', { formatNumber: formatNumber(kpis.gamesFinished), formatNumber2: formatNumber(kpis.gamesStarted) })} />
                <KpiHero label={t('Club X01 average')} value={kpis.x01Average} color={GREEN} />
                <KpiHero
                    label={t('Games this month')}
                    value={formatNumber(kpis.gamesThisMonth)}
                    color={GREEN}
                    detail={(
                        <span className={monthTrend >= 0 ? 'text-success' : 'text-subtle'}>
                            <TrendIcon className="me-1" aria-hidden="true" />
                            {monthTrend === 0 ? t('as many as last month') : monthTrend > 0 ? t('{{count}} more than last month', { count: monthTrend }) : t('{{count}} fewer than last month', { count: Math.abs(monthTrend) })}
                        </span>
                    )}
                />
                <KpiRing label={t('Checkout rate')} part={kpis.checkoutHit} whole={kpis.checkoutTotal} color={GREEN} detail={t('{{formatNumber}} of {{formatNumber2}} attempts', { formatNumber: formatNumber(kpis.checkoutHit), formatNumber2: formatNumber(kpis.checkoutTotal) })} />
            </div>
            <div className="kpi-chips">
                <KpiChip icon={FaBullseye} label={t('X01 games')} value={formatNumber(totals.x01)} color={TYPE_COLORS.x01} />
                <KpiChip icon={MdSportsCricket} label={t('Cricket games')} value={formatNumber(totals.cricket)} color={TYPE_COLORS.cricket} />
                <KpiChip icon={BiTargetLock} label={t('Elimination games')} value={formatNumber(totals.elimination)} color={TYPE_COLORS.elimination} />
                <KpiChip icon={PiClockClockwiseBold} label={t('Around the Clock games')} value={formatNumber(totals.clock ?? 0)} color={TYPE_COLORS.clock} />
                <KpiChip icon={FaPlay} label={t('Running now')} value={formatNumber(totals.running)} color={GREEN} />
                <KpiChip icon={FaUsers} label={t('Active this month')} value={t('{{formatNumber}} players', { formatNumber: formatNumber(kpis.activePlayersThisMonth) })} color={GREEN} />
                <KpiChip icon={FaFire} label={t('180s')} value={formatNumber(kpis.num180s)} color={GREEN} />
                <KpiChip icon={FaCrosshairs} label={kpis.highestCheckout ? t('Highest checkout · {{nameOf}}', { nameOf: nameOf(kpis.highestCheckout.player) }) : t('Highest checkout')} value={kpis.highestCheckout?.value} color={GREEN} />
                <KpiChip icon={FaStopwatch} label={kpis.bestLeg ? t('Best 501 leg · {{nameOf}}', { nameOf: nameOf(kpis.bestLeg.player) }) : t('Best 501 leg')} value={kpis.bestLeg ? t('{{value}} darts', { value: kpis.bestLeg.value }) : null} color={GREEN} />
                <KpiChip icon={FaFlagCheckered} label={t('Legs played')} value={formatNumber(kpis.legsPlayed)} color={GREEN} />
                <KpiChip icon={GiDart} label={t('Darts thrown')} value={formatNumber(kpis.dartsThrown)} color={GREEN} />
                <KpiChip icon={FaCalendarCheck} label={kpis.longestStreak ? t('Longest weekly streak · {{nameOf}}', { nameOf: nameOf(kpis.longestStreak.player) }) : t('Longest weekly streak')} value={kpis.longestStreak ? t('{{value}} weeks', { value: kpis.longestStreak.value }) : null} color={GREEN} />
            </div>
        </Panel>
    );
};

export default ClubKpisWidget;
