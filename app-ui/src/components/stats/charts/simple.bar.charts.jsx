import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import dayjs from 'dayjs';

import ChartCard from './chart.card';
import { AXIS, BAR_OPACITY, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';

const RANGE_ORDER = ['180', '160-179', '140-159', '120-139', '100-119', '80-99', '60-79', '40-59', '20-39', '1-19', 'ZERO'];
const rangeLabel = (range) => range === 'ZERO' ? '0' : range.replace('-', '–');

/**
 * Share of visits per score range, highest scores on top.
 * data: [{ range, count }] for one player, [{ range, player1Count, … }] for several
 */
export const ScoreRangesChart = ({ data = [], players = [] }) => {
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
        <ChartCard title="Score per visit" description="How often each score range was thrown, as a share of all visits.">
            <ResponsiveContainer width="100%" height={Math.max(260, rows.length * (players.length > 1 ? 30 : 26))}>
                <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }} barGap={2}>
                    <CartesianGrid {...GRID} horizontal={false} vertical />
                    <XAxis type="number" {...AXIS} unit=" %" />
                    <YAxis type="category" dataKey="range" {...AXIS} width={64} interval={0} />
                    <Tooltip {...TOOLTIP} formatter={(value) => `${value} %`} />
                    {players.map((player, index) => (
                        <Bar key={player.id} dataKey={`p${index}`} name={player.nickname} fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} radius={[0, 4, 4, 0]}>
                            {players.length === 1 && <LabelList dataKey={`p${index}`} position="right" fill="#9a9a9a" fontSize={11} formatter={(value) => value ? `${value} %` : ''} />}
                        </Bar>
                    ))}
                    {players.length > 1 && <Legend {...LEGEND} />}
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
                        <Bar key={player.id} dataKey={`p${index}`} name={player.nickname} fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} radius={[4, 4, 0, 0]} maxBarSize={56}>
                            <LabelList dataKey={`p${index}`} position="top" fill="#d4d4d4" fontSize={12} />
                        </Bar>
                    ))}
                    {players.length > 1 && <Legend {...LEGEND} />}
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
                                <Bar key={player.id} dataKey={keyOf(index)} name={player.nickname} fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} radius={[4, 4, 0, 0]} />
                            ))}
                            {players.length > 1 && <Legend {...LEGEND} />}
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
    // series switched off in the legend
    const [hidden, setHidden] = useState(() => new Set());
    const toggle = ({ dataKey }) => setHidden(current => {
        const next = new Set(current);
        if (next.has(dataKey)) next.delete(dataKey);
        else next.add(dataKey);
        return next;
    });
    const legendLabel = (name, { dataKey }) => <span style={{ opacity: hidden.has(dataKey) ? 0.4 : 1, cursor: 'pointer' }}>{name}</span>;

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
                            <Bar yAxisId="rate" dataKey="winRate" name="Win rate" fill={PLAYER_COLORS[0]} fillOpacity={BAR_OPACITY} radius={[4, 4, 0, 0]} hide={hidden.has('winRate')} />
                            <Line yAxisId="avg" type="monotone" dataKey="average" name="Average" stroke={PLAYER_COLORS[1]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls hide={hidden.has('average')} />
                            <Line yAxisId="games" type="monotone" dataKey="games" name="Games played" stroke={PLAYER_COLORS[2]} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} hide={hidden.has('games')} />
                            <Legend {...LEGEND} onClick={toggle} formatter={legendLabel} />
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
    const rows = [...games]
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .map(game => ({
            label: dayjs(game.updatedAt).format('DD.MM.YY'),
            ...Object.fromEntries(players.map((player, index) => [`p${index}`, game.playerModels?.[player.id]?.legsWon?.game ?? 0])),
        }));
    return (
        <ChartCard title="Legs per game" description="Legs each player won in every game they played together, oldest first.">
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="label" {...AXIS} minTickGap={16} />
                    <YAxis {...AXIS} allowDecimals={false} />
                    <Tooltip {...TOOLTIP} />
                    {players.map((player, index) => (
                        <Bar key={player.id} dataKey={`p${index}`} name={player.nickname} stackId="legs" fill={PLAYER_COLORS[index]} fillOpacity={BAR_OPACITY} />
                    ))}
                    <Legend {...LEGEND} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};
