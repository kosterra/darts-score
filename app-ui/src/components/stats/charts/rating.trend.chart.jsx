import { useEffect, useState } from 'react';
import { Skeleton } from 'primereact/skeleton';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartCard from './chart.card';
import ChartTooltip from './chart.tooltip';
import { AXIS, GRID, TOOLTIP } from './chart.theme';
import StatsService from '../../../services/stats.service';
import useMediaQuery from '../../../utils/use.media.query';
import { ACCENT, readable } from '../../../utils/palette';
import { formatDate } from '../../../utils/dates';
import { locale, t } from '../../../utils/i18n';

// where every rating starts (see app-api utils/compare.js)
const RATING_START = 1000;
// the latest changes listed under the chart
const SHOWN_CHANGES = 5;

const signed = (value) => `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value)}`;

/**
 * A player's club rating over time: the rating at the end of each day it
 * changed, a line at 1000 where everyone starts, and the latest changes with
 * whom they played. Loaded when it is shown (its own request), always from
 * the club's games whatever the page's filters. On a phone the axis shows
 * fewer dates.
 */
const RatingTrendChart = ({ playerId }) => {
    const [data, setData] = useState(null);
    const phone = useMediaQuery('(max-width: 575.98px)');

    useEffect(() => {
        let cancelled = false;
        StatsService.loadPlayerRating(playerId)
            .catch(() => ({ history: [], lastChanges: [] }))
            .then(loaded => { if (!cancelled) setData(loaded); });
        return () => { cancelled = true; };
    }, [playerId]);

    const rows = (data?.history ?? []).map(point => ({ ...point, label: formatDate(point.at, { year: 'short' }) }));
    const changes = (data?.lastChanges ?? []).slice(0, SHOWN_CHANGES);
    // the axis in steps of 50, always with 1000 on it
    const values = rows.map(row => row.rating);
    const low = Math.floor(Math.min(RATING_START, ...values) / 50) * 50;
    const high = Math.ceil(Math.max(RATING_START, ...values) / 50) * 50;
    const ticks = Array.from({ length: (high - low) / 50 + 1 }, (_, index) => low + index * 50);
    const green = readable(ACCENT.green);
    const red = readable(ACCENT.red);

    return (
        <ChartCard title={t('Rating over time')} description={t('The club rating: wins weighed by whom they beat, from 5 games on')} className="rating-trend-chart">
            {data === null
                ? <Skeleton height="240px" />
                : rows.length === 0
                    ? <p className="text-faint fs-7">{t('No games played yet that count for this.')}</p>
                    : (
                        <>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                                    <CartesianGrid {...GRID} />
                                    <XAxis dataKey="label" {...AXIS} minTickGap={phone ? 48 : 24} interval="preserveStartEnd" />
                                    <YAxis {...AXIS} domain={[low, high]} ticks={ticks} interval={0} />
                                    <Tooltip cursor={TOOLTIP.cursor} content={<ChartTooltip formatValue={(value) => Math.round(Number(value))} />} />
                                    <ReferenceLine y={RATING_START} stroke={ACCENT.cream} strokeOpacity={0.4} strokeDasharray="4 4" label={{ value: String(RATING_START), fill: ACCENT.cream, fontSize: 12, position: 'insideTopRight' }} />
                                    <Line type="monotone" dataKey="rating" name={t('Club rating')} stroke={ACCENT.green} strokeWidth={2.5} dot={rows.length <= 30 ? { r: 2.5, fill: ACCENT.green, strokeWidth: 0 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                            {changes.length > 0 &&
                                <ul className="rating-changes list-unstyled m-0 mt-3 d-flex flex-column gap-1 fs-7">
                                    {changes.map((change, index) => (
                                        <li key={`${change.sourceId}-${index}`} className="d-flex align-items-baseline gap-2">
                                            <span className="fw-semibold tabular-nums rating-change" style={{ color: change.change >= 0 ? green : red }}>{signed(change.change)}</span>
                                            <span className="text-default text-truncate">{t('against {{names}}', { names: change.opponents.map(opponent => opponent.nickname ?? t('Unknown')).join(', ') })}</span>
                                            <span className="text-faint fs-8 ms-auto text-nowrap">{formatDate(change.at)}</span>
                                        </li>
                                    ))}
                                </ul>
                            }
                        </>
                    )
            }
        </ChartCard>
    );
};

export default RatingTrendChart;
