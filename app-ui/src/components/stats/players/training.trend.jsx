import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Skeleton } from 'primereact/skeleton';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { KpiHero } from './kpi';
import ChartTooltip from '../charts/chart.tooltip';
import { AXIS, GRID, TOOLTIP } from '../charts/chart.theme';
import RulesService from '../../../services/rules.service';
import { trainingOf } from '../../../rules/trainings';
import useMediaQuery from '../../../utils/use.media.query';
import { ACCENT, GAME_COLORS } from '../../../utils/palette';
import { formatDate } from '../../../utils/dates';
import { progressOf, trendOf } from '../../../utils/training.trend';
import { locale, t } from '../../../utils/i18n';

// the dates on the attempt axis (fewer on a phone)
const DATE_TICKS = 5;
const PHONE_DATE_TICKS = 3;

const signed = (value) => `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value)}`;

/**
 * Every attempt of a player at one kind of training over time, in a dialog
 * from their trainings panel: the results as a line with the personal best
 * as it grew (a dashed step), how many attempts, the best, and the latest
 * attempts against the first ones. Where fewer darts are better the axis is
 * upside down, so up is always better. Loaded when it opens.
 */
const TrainingTrend = ({ kind, playerId, onHide }) => {
    const definition = trainingOf(kind);
    const [trainings, setTrainings] = useState(null);
    const phone = useMediaQuery('(max-width: 575.98px)');

    useEffect(() => {
        let cancelled = false;
        RulesService.loadTrainings(kind)
            .catch(() => [])
            .then(loaded => { if (!cancelled) setTrainings(loaded); });
        return () => { cancelled = true; };
    }, [kind]);

    if (!definition) return null;
    const lower = definition.higherIsBetter === false;
    const rows = trainings ? trendOf(trainings, playerId, lower) : [];
    const progress = progressOf(rows, lower);
    const best = rows.at(-1)?.best ?? null;
    const dateCount = Math.min(phone ? PHONE_DATE_TICKS : DATE_TICKS, rows.length);
    const dateTicks = dateCount > 1 ? Array.from({ length: dateCount }, (_, index) => Math.round(((rows.length - 1) * index) / (dateCount - 1))) : [0];
    const format = (value) => definition.format(Math.round(Number(value) * 10) / 10);
    // whole numbers where every result is one (points, darts), else one decimal (an average)
    const whole = rows.every(row => Number.isInteger(row.score));
    const change = progress ? (whole ? Math.round(progress.change) : Math.round(progress.change * 10) / 10) : null;
    // the best as a bare number beside the others (the unit would crowd them on a phone), a share keeps its %
    const bare = (value) => (format(value).includes('%') ? format(value) : whole ? String(value) : Number(value).toFixed(1));

    return (
        <Dialog header={definition.title} visible onHide={onHide} className="training-trend-dialog" dismissableMask>
            {trainings === null
                ? <Skeleton height="300px" />
                : rows.length === 0
                    ? <p className="text-faint fs-7 m-0">{t('No attempts in this club yet.')}</p>
                    : <div className="d-flex flex-column gap-3">
                        <div className="kpi-headline">
                            <KpiHero label={t('Attempts')} value={rows.length} color={GAME_COLORS.rules} />
                            <KpiHero label={t('Best')} value={bare(best)} color={GAME_COLORS.rules} />
                            <KpiHero
                                label={progress ? t('The last {{count}} against the first', { count: progress.size }) : t('Progress')}
                                value={progress ? signed(change) : '–'}
                                detail={progress ? null : t('From four attempts on')}
                                color={GAME_COLORS.rules}
                            />
                        </div>
                        <p className="text-faint fs-8 m-0">
                            {lower
                                ? t('Every attempt, oldest first; the dashed line is your best so far. Fewer is better, so the axis is upside down: up is better.')
                                : t('Every attempt, oldest first; the dashed line is your best so far.')}
                        </p>
                        <ResponsiveContainer width="100%" height={phone ? 220 : 260}>
                            <LineChart data={rows} margin={{ top: 10, right: 32, left: -10, bottom: 0 }}>
                                <CartesianGrid {...GRID} />
                                <XAxis dataKey="index" type="number" domain={[0, Math.max(1, rows.length - 1)]} ticks={dateTicks} tickFormatter={(index) => formatDate(rows[index]?.at, { year: 'short' })} {...AXIS} interval={0} />
                                <YAxis {...AXIS} reversed={lower} domain={['auto', 'auto']} allowDecimals={false} width={48} />
                                <Tooltip cursor={TOOLTIP.cursor} content={<ChartTooltip labelFormatter={(index) => formatDate(rows[index]?.at)} formatValue={format} />} />
                                {/* straight between the attempts (a curve would show results that were never thrown); the result first in the tooltip */}
                                <Line type="linear" dataKey="score" name={t('Result')} stroke={GAME_COLORS.rules} strokeWidth={2.5} dot={rows.length <= 30 ? { r: 2.5, fill: GAME_COLORS.rules, strokeWidth: 0 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
                                <Line type="stepAfter" dataKey="best" name={t('Best so far')} stroke={ACCENT.gold} strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
            }
        </Dialog>
    );
};

export default TrainingTrend;
