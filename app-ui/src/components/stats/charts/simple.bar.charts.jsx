import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';

import ChartCard from './chart.card';
import useHiddenSeries from './use.hidden.series';
import { groupByPeriod } from '../../../utils/trend.grouping';
import { AXIS, BAR_OPACITY, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';

const RANGE_ORDER = ['180', '160-179', '140-159', '120-139', '100-119', '80-99', '60-79', '40-59', '20-39', '1-19', 'ZERO'];
const rangeLabel = (range) => range === 'ZERO' ? '0' : range.replace('-', '–');

/**
 * Share of visits per score range, highest scores on top.
 * data: [{ range, count }] for one player, [{ range, player1Count, … }] for several
 */
export const ScoreRangesChart = ({ data = [], players = [] }) => {
    const series = useHiddenSeries();
    const keyOf = (index) => players.length === 1 ? 'count' : `player${index + 1}Count`;
    const totals = players.map((_, index) => data.reduce((sum, entry) => sum + (Number(entry[keyOf(index)]) || 0), 0));
    const byRange = new Map(data.map(entry => [entry.range, entry]));
    const rows = RANGE_ORDER.filter(range => byRange.has(range)).map(range => {
        const row = { range: rangeLabel(range) };
        players.forEach((_, index) => {
            const count = Number(byRange.get(range)[keyOf(index)]) || 0;
            row[`p${index}`] = totals[index] ? Math.round(count / totals[index] * 1000) / 10 : 0;
        });
        return row;
    });

    return (
        <ChartCard title="Score per visit" description={`How often each score range was thrown, as a share of all visits.${players.length > 1 ? ' Click a name below the chart to show or hide that player.' : ''}`}>
            <ResponsiveContainer width="100%" height={Math.max(260, rows.length * (players.length > 1 ? 30 : 26))}>
                <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }} barGap={2}>
                    <CartesianGrid {...GRID} horizontal={false} vertical />
                    <XAxis type="number" {...AXIS} unit=" %" />
                    <YAxis type="category" dataKey="range" {...AXIS} width={64} interval={0} />
                    <Tooltip {...TOOLTIP} formatter={(value) => `${value} %`} />
                    {players.map((player, index) => (
                        <Bar key={player.id} dataKey={`p${index}`} name={player.nickname} fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} radius={[0, 4, 4, 0]} hide={series.isHidden(`p${index}`)}>
                            {players.length === 1 && <LabelList dataKey={`p${index}`} position="right" fill="#9a9a9a" fontSize={11} formatter={(value) => value ? `${value} %` : ''} />}
                        </Bar>
                    ))}
                    {players.length > 1 && <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />}
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

/**
 * Average while scoring (start and middle of a leg) against average while
 * finishing (end of the leg).
 * scoring: [{ opening, finishing }] one per player
 */
export const ScoringFinishingChart = ({ scoring = [], players = [] }) => {
    const series = useHiddenSeries();
    const rows = [
        { phase: 'Scoring', ...Object.fromEntries(players.map((_, index) => [`p${index}`, scoring[index]?.opening ?? 0])) },
        { phase: 'Finishing', ...Object.fromEntries(players.map((_, index) => [`p${index}`, scoring[index]?.finishing ?? 0])) },
    ];
    return (
        <ChartCard title="Scoring vs. finishing" description="Average at the start and in the middle of a leg, against the average at the end of the leg, where the doubles decide.">
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rows} margin={{ top: 20, right: 16, left: -10, bottom: 0 }} barGap={6}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="phase" {...AXIS} />
                    <YAxis {...AXIS} />
                    <Tooltip {...TOOLTIP} />
                    {players.map((player, index) => (
                        <Bar key={player.id} dataKey={`p${index}`} name={player.nickname} fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} radius={[4, 4, 0, 0]} maxBarSize={56} hide={series.isHidden(`p${index}`)}>
                            <LabelList dataKey={`p${index}`} position="top" fill="#d4d4d4" fontSize={12} />
                        </Bar>
                    ))}
                    {players.length > 1 && <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />}
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

/**
 * How many darts the won 501 legs needed.
 * data: [{ bucket, count }] for one player, [{ bucket, player1, … }] for several
 */
export const DartsPerLegChart = ({ data = [], players = [], description = 'Darts needed for the 501 legs won. Nine is the perfect leg.' }) => {
    const series = useHiddenSeries();
    const keyOf = (index) => players.length === 1 ? 'count' : `player${index + 1}`;
    const empty = data.every(entry => players.every((_, index) => !entry[keyOf(index)]));
    return (
        <ChartCard title="Darts per leg" description={description}>
            {empty
                ? <p className="text-faint fs-7">No legs won yet.</p>
                : (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={data} margin={{ top: 20, right: 16, left: -10, bottom: 0 }} barGap={2}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="bucket" {...AXIS} interval={0} />
                            <YAxis {...AXIS} allowDecimals={false} />
                            <Tooltip {...TOOLTIP} />
                            {players.map((player, index) => (
                                <Bar key={player.id} dataKey={keyOf(index)} name={player.nickname} fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} radius={[4, 4, 0, 0]} hide={series.isHidden(keyOf(index))} />
                            ))}
                            {players.length > 1 && <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />}
                        </BarChart>
                    </ResponsiveContainer>
                )
            }
        </ChartCard>
    );
};

/**
 * Win rate and X01 average per month.
 * data: [{ month: 'YYYY-MM', games, wins, winRate, average }]
 */
export const FormChart = ({ data = [] }) => {
    const rows = data.map(entry => ({ ...entry, label: dayjs(`${entry.month}-01`).format('MMM YY') }));
    const series = useHiddenSeries();

    return (
        <ChartCard title="Form" description="Win rate (bars), X01 average and games played (lines) per month: how the form goes with how often you play. Click an entry below the chart to show or hide it.">
            {rows.length === 0
                ? <p className="text-faint fs-7">No games yet.</p>
                : (
                    <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={rows} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="label" {...AXIS} minTickGap={16} />
                            <YAxis yAxisId="rate" {...AXIS} domain={[0, 100]} unit=" %" />
                            <YAxis yAxisId="avg" orientation="right" {...AXIS} domain={[0, 'auto']} />
                            {/* games have their own scale, without an axis of their own */}
                            <YAxis yAxisId="games" hide domain={[0, (max) => Math.max(max, 1) * 1.15]} allowDecimals={false} />
                            <Tooltip {...TOOLTIP} formatter={(value, name) => name === 'Win rate' ? `${value} %` : value} />
                            <Bar yAxisId="rate" dataKey="winRate" name="Win rate" fill={PLAYER_COLORS[0]} fillOpacity={BAR_OPACITY} radius={[4, 4, 0, 0]} hide={series.isHidden('winRate')} />
                            <Line yAxisId="avg" type="monotone" dataKey="average" name="Average" stroke={PLAYER_COLORS[1]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls hide={series.isHidden('average')} />
                            <Line yAxisId="games" type="monotone" dataKey="games" name="Games played" stroke={PLAYER_COLORS[2]} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} hide={series.isHidden('games')} />
                            <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )
            }
        </ChartCard>
    );
};

/**
 * Legs won by each player in every game of a comparison.
 * games: X01 game documents; players: the compared players
 */
export const LegsPerGameChart = ({ games = [], players = [] }) => {
    const series = useHiddenSeries();
    const keys = players.map((_, index) => `p${index}`);
    const perGame = [...games]
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .map(game => ({
            date: game.updatedAt,
            ...Object.fromEntries(players.map((player, index) => [`p${index}`, game.playerModels?.[player.id]?.legsWon?.game ?? 0])),
        }));
    // many games: the legs added up per month or quarter instead of a bar per game
    const { rows, step } = groupByPeriod(perGame, keys, { combine: 'sum' });
    const perPeriod = step !== 'game';
    const tooltipLabel = (label, payload) => {
        const count = payload?.[0]?.payload?.games;
        return perPeriod && count ? `${label} · ${count} ${count === 1 ? 'game' : 'games'}` : label;
    };
    return (
        <ChartCard
            title={perPeriod ? `Legs per ${step}` : 'Legs per game'}
            description={perPeriod
                ? `Legs each player won per ${step} in the games they played together.`
                : 'Legs each player won in every game they played together, oldest first.'}
        >
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="label" {...AXIS} minTickGap={16} />
                    <YAxis {...AXIS} allowDecimals={false} />
                    <Tooltip {...TOOLTIP} labelFormatter={tooltipLabel} />
                    {players.map((player, index) => (
                        <Bar key={player.id} dataKey={`p${index}`} name={player.nickname} stackId="legs" fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} hide={series.isHidden(`p${index}`)} />
                    ))}
                    <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};
