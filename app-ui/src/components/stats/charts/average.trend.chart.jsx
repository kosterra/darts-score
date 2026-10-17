import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';

import ChartCard from './chart.card';
import useHiddenSeries from './use.hidden.series';
import { AXIS, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';

const MOVING_WINDOW = 5;

const movingAverage = (values, index) => {
    const window = values.slice(Math.max(0, index - MOVING_WINDOW + 1), index + 1).filter(value => value != null);
    return window.length ? Math.round(window.reduce((a, b) => a + b, 0) / window.length * 10) / 10 : null;
};

/**
 * The three-dart average of every game over time. One player gets a moving
 * average and their overall average as a reference; several players a line each.
 *
 * data: [{ date | label, average }] for one player, [{ date | label, player1, player2, … }] for several
 */
const AverageTrendChart = ({ data = [], players = [], overall, title = 'Average over time', description }) => {
    const series = useHiddenSeries();
    const single = players.length === 1;
    const rows = data.map((entry, index) => ({
        ...entry,
        // entries either carry their own label (e.g. the leg) or a date
        label: entry.label ?? dayjs(entry.date).format('DD.MM.YY'),
        ...(single && { moving: movingAverage(data.map(d => d.average), index) }),
    }));

    return (
        <ChartCard
            title={title}
            description={description ?? (single
                ? `Average of every X01 game, with the trend over the last ${MOVING_WINDOW} games and the overall average.`
                : 'Average of every X01 game the players played together.')}
        >
            {rows.length === 0
                ? <p className="text-faint fs-7">No averages yet.</p>
                : (
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="label" {...AXIS} minTickGap={24} />
                            <YAxis {...AXIS} domain={[0, 'auto']} />
                            <Tooltip {...TOOLTIP} />
                            {single
                                ? (
                                    <>
                                        <Area type="monotone" dataKey="average" name="Game average" stroke={PLAYER_COLORS[0]} fill={PLAYER_COLORS[0]} fillOpacity={0.18} strokeOpacity={0.5} dot={false} hide={series.isHidden('average')} />
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
