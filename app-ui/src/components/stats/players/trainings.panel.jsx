import { Panel } from 'primereact/panel';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PiClockCountdownBold } from 'react-icons/pi';
import { FaRobot } from 'react-icons/fa6';

import { KpiHero } from './kpi';
import { trainingOf } from '../../../rules/trainings';
import { rulesIcon } from '../../rules/rules.icons';
import { formatTrainingTime } from '../../../utils/training.time';
import { locale, t, tn } from '../../../utils/i18n';
import { formatDate } from '../../../utils/dates';

dayjs.extend(relativeTime);

const COLORS = { atc: '#86bfe6', bot: '#7ecca5', rules: '#e69ac0' };
const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

// the recent results as a small line, the last one marked; lower: less is better (drawn the other way up)
const Sparkline = ({ values = [], lower = false, color }) => {
    if (values.length < 2) return null;
    const width = 96;
    const height = 28;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * (width - 4) + 2;
        const share = (value - min) / span;
        const y = 2 + (lower ? share : 1 - share) * (height - 4);
        return [x, y];
    });
    const [lastX, lastY] = points.at(-1);
    return (
        <svg className="training-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <polyline points={points.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
        </svg>
    );
};

// one kind of training: what it is, the best result big, a line under it, how often and the trend
const TrainingCard = ({ icon: Icon, title, value, detail, count, color, spark }) => (
    <div className="training-card" style={{ '--kpi-color': color }}>
        <div className="training-card-head">
            <span className="kpi-chip-icon" aria-hidden="true"><Icon /></span>
            <span className="d-flex flex-column" style={{ minWidth: 0 }}>
                <span className="training-card-title">{title}</span>
                <span className="training-card-count">{count}</span>
            </span>
        </div>
        <div className="training-card-body">
            <span className="d-flex flex-column" style={{ minWidth: 0 }}>
                <span className="training-card-value">{value ?? '–'}</span>
                {detail && <span className="training-card-detail">{detail}</span>}
            </span>
            {spark}
        </div>
    </div>
);

/**
 * Every training of a player in one panel: how many, how many lately and
 * when the last one was, then a card per kind with its best, how often and
 * the trend of the last results.
 * summary: { total, last30Days, lastAt, atc, bot, rules } from the API
 */
const TrainingsPanel = ({ summary }) => {
    if (!summary?.total) return null;
    const { atc, bot, rules } = summary;
    const rulesKinds = Object.entries(rules ?? {}).filter(([kind, entry]) => trainingOf(kind) && entry.count > 0);

    return (
        <Panel header={t('Trainings')} className="h-100">
            <div className="kpi-headline mb-4">
                <KpiHero label={t('Trainings')} value={formatNumber(summary.total)} color={COLORS.bot} />
                <KpiHero label={t('In the last 30 days')} value={formatNumber(summary.last30Days)} color={COLORS.bot} />
                <KpiHero label={t('Last training')} value={summary.lastAt ? formatDate(summary.lastAt, { year: 'none' }) : '–'} detail={summary.lastAt ? dayjs(summary.lastAt).fromNow() : null} color={COLORS.bot} />
            </div>
            <div className="training-cards">
                {atc.count > 0 &&
                    <TrainingCard
                        icon={PiClockCountdownBold}
                        title={t('Around the Clock')}
                        color={COLORS.atc}
                        count={tn(atc.count, '{{count}} attempt', '{{count}} attempts')}
                        value={atc.fastest ? formatTrainingTime(atc.fastest.timeMs) : atc.fewestDarts ? tn(atc.fewestDarts.darts, '{{count}} dart', '{{count}} darts') : null}
                        detail={[
                            atc.fastest && t('fastest in {{mode}}', { mode: t(atc.fastest.mode) }),
                            atc.fewestDarts && (atc.fastest
                                ? t('{{darts}} darts fewest ({{mode}})', { darts: atc.fewestDarts.darts, mode: t(atc.fewestDarts.mode) })
                                : t('fewest darts in {{mode}}', { mode: t(atc.fewestDarts.mode) })),
                        ].filter(Boolean).join(' · ')}
                    />
                }
                {bot.count > 0 &&
                    <TrainingCard
                        icon={FaRobot}
                        title={t('X01 against the bot')}
                        color={COLORS.bot}
                        count={tn(bot.count, '{{count}} attempt', '{{count}} attempts')}
                        value={bot.finished ? t('{{wins}} of {{games}} won', { wins: bot.wins, games: bot.finished }) : null}
                        detail={bot.average != null ? t('Average {{average}} · best {{best}}', { average: bot.average.toFixed(1), best: bot.bestAverage.toFixed(1) }) : null}
                        spark={<Sparkline values={bot.recent} color={COLORS.bot} />}
                    />
                }
                {rulesKinds.map(([kind, entry]) => {
                    const definition = trainingOf(kind);
                    const lower = definition.higherIsBetter === false;
                    return (
                        <TrainingCard
                            key={kind}
                            icon={rulesIcon(kind)}
                            title={definition.title}
                            color={COLORS.rules}
                            count={tn(entry.count, '{{count}} attempt', '{{count}} attempts')}
                            value={entry.best == null ? null : definition.format(entry.best)}
                            detail={entry.latest?.length && entry.latest.at(-1) !== entry.best ? t('best · last {{last}}', { last: definition.format(entry.latest.at(-1)) }) : t('best')}
                            spark={<Sparkline values={entry.latest} lower={lower} color={COLORS.rules} />}
                        />
                    );
                })}
            </div>
        </Panel>
    );
};

export default TrainingsPanel;
