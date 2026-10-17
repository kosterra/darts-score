import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';

import ChartCard from './chart.card';
import useHiddenSeries from './use.hidden.series';
import { AXIS, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';
import { groupByPeriod } from '../../../utils/trend.grouping';

const MOVING_WINDOW = 5;
// grouped by month or quarter, the trend follows fewer points
const MOVING_PERIODS = 3;

const movingAverage = (values, index, size = MOVING_WINDOW) => {
    const window = values.slice(Math.max(0, index - size + 1), index + 1).filter(value => value != null);
    return window.length ? Math.round(window.reduce((a, b) => a + b, 0) / window.length * 10) / 10 : null;
};

/**
 * The three-dart average of every game over time. One player gets a moving
 * average and their overall average as a reference; several players a line
 * each. More than 30 games are grouped by month, or by quarter over three years.
 *
 * data: [{ date | label, average }] for one player, [{ date | label, player1, player2, … }] for several
 */
const AverageTrendChart = ({ data = [], players = [], overall, title = 'Average over time', description }) => {
    const series = useHiddenSeries();
    const single = players.length === 1;
    // many games over time: a point per month or quarter, not per game
    // (the legs of one game carry labels and stay as they are)
    const dated = data.length > 0 && data.every(entry => entry.date && entry.label == null);
    const keys = single ? ['average'] : players.map((_, index) => `player${index + 1}`);
    const grouped = dated ? groupByPeriod(data, keys) : null;
    const byPeriod = grouped && grouped.step !== 'game';
    const base = grouped ? grouped.rows : data.map(entry => ({
        ...entry,
        // entries either carry their own label (e.g. the leg) or a date
        label: entry.label ?? dayjs(entry.date).format('DD.MM.YY'),
    }));
    const rows = single
        ? base.map((entry, index) => ({ ...entry, moving: movingAverage(base.map(d => d.average), index, byPeriod ? MOVING_PERIODS : MOVING_WINDOW) }))
        : base;
    const period = grouped?.step === 'quarter' ? 'quarter' : 'month';
    const STEP_TEXT = {
        game: 'Average of every X01 game the players played together.',
        month: 'Average per month of the X01 games the players played together.',
        quarter: 'Average per quarter of the X01 games the players played together.',
    };
    const singleText = byPeriod
        ? `Average per ${period} of the X01 games, with the trend over the last ${MOVING_PERIODS} ${period}s and the overall average.`
        : `Average of every X01 game, with the trend over the last ${MOVING_WINDOW} games and the overall average.`;
    // a grouped point says how many games it stands for
    const tooltipLabel = (label, payload) => {
        const games = payload?.[0]?.payload?.games;
        return byPeriod && games ? `${label} · ${games} ${games === 1 ? 'game' : 'games'}` : label;
    };

    return (
        <ChartCard
            title={title}
            description={description ?? (single ? singleText : STEP_TEXT[grouped?.step ?? 'game'])}
        >
            {rows.length === 0
                ? <p className="text-faint fs-7">No averages yet.</p>
                : (
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="label" {...AXIS} minTickGap={24} />
                            <YAxis {...AXIS} domain={[0, 'auto']} />
                            <Tooltip {...TOOLTIP} labelFormatter={tooltipLabel} />
                            {single
                                ? (
                                    <>
                                        <Area type="monotone" dataKey="average" name={byPeriod ? `Average per ${period}` : 'Game average'} stroke={PLAYER_COLORS[0]} fill={PLAYER_COLORS[0]} fillOpacity={0.18} strokeOpacity={0.5} dot={false} hide={series.isHidden('average')} />
                                        <Line type="monotone" dataKey="moving" name="Trend" stroke="#efe6d0" strokeWidth={2.5} dot={false} hide={series.isHidden('moving')} />
                                        {overall > 0 &&
                                            <ReferenceLine y={overall} stroke={PLAYER_COLORS[1]} strokeDasharray="6 4" label={{ value: `Ø ${overall}`, fill: PLAYER_COLORS[1], fontSize: 12, position: 'insideTopRight' }} />
                                        }
                                    </>
                                )
                                : players.map((player, index) => (
                                    <Line key={player.id} type="monotone" dataKey={`player${index + 1}`} name={player.nickname} stroke={PLAYER_COLORS[index]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls hide={series.isHidden(`player${index + 1}`)} />
                                ))
                            }
                            <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )
            }
        </ChartCard>
    );
};

export default AverageTrendChart;
