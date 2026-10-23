import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartCard from './chart.card';
import useHiddenSeries from './use.hidden.series';
import ChartTooltip from './chart.tooltip';
import { AXIS, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';
import { groupByPeriod } from '../../../utils/trend.grouping';
import { averageLevelOf, levelChanges, nextAverageLevel } from '../../../utils/average.levels';
import { t, tn } from '../../../utils/i18n';
import { formatDate } from '../../../utils/dates';

const MOVING_WINDOW = 5;
// grouped by month or quarter, the trend follows fewer points
const MOVING_PERIODS = 3;

const movingAverage = (values, index, size = MOVING_WINDOW) => {
    const window = values.slice(Math.max(0, index - size + 1), index + 1).filter(value => value != null);
    return window.length ? Math.round(window.reduce((a, b) => a + b, 0) / window.length * 10) / 10 : null;
};

/**
 * A point of a line where the average reaches a new level: a round badge with
 * the level's icon, in the look of the player level badges (a soft fill and a
 * ring in the level's colour); its name shows on hovering.
 */
const levelMarker = (changes) => function LevelMarker(props) {
    const { cx, cy, index, payload, value } = props;
    const level = changes.get(index);
    if (!level || cx == null || cy == null) return <g key={`level-${index}`} />;
    const Icon = level.icon;
    const average = Math.round(Number(value) * 10) / 10;
    return (
        <g key={`level-${index}`} className="average-level-marker">
            <title>{t('{{name}} · from {{value}} · average {{average}}', { name: level.name, value: payload?.label ?? '', average: average })}</title>
            {/* the card's colour first, so the line does not show through the soft fill */}
            <circle cx={cx} cy={cy} r={11} fill="#292929" />
            <circle cx={cx} cy={cy} r={11} fill={level.color} fillOpacity={0.18} stroke={level.color} strokeOpacity={0.75} strokeWidth={1.5} />
            <Icon x={cx - 6} y={cy - 6} size={12} color={level.color} aria-hidden="true" />
        </g>
    );
};

/**
 * The three-dart average of every game over time. One player gets a moving
 * average and their overall average as a reference; several players a line
 * each. More than 30 games are grouped by month, or by quarter over three years.
 * Over time (not for the legs of one game) the average levels show where they
 * change, up and down: on one player's trend line, so a single game does not
 * flip them, and on the players' lines in a comparison. Lines mark the level
 * reached and the next one; the tooltip names each value's level.
 *
 * data: [{ date | label, average }] for one player, [{ date | label, player1, player2, … }] for several
 */
const AverageTrendChart = ({ data = [], players = [], overall, title = t('Average over time'), description }) => {
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
        label: entry.label ?? formatDate(entry.date, { year: 'short' }),
    }));
    const rows = single
        ? base.map((entry, index) => ({ ...entry, moving: movingAverage(base.map(d => d.average), index, byPeriod ? MOVING_PERIODS : MOVING_WINDOW) }))
        : base;
    const period = grouped?.step === 'quarter' ? 'quarter' : 'month';
    const STEP_TEXT = {
        game: t('Average of every X01 game the players played together.'),
        month: t('Average per month of the X01 games the players played together.'),
        quarter: t('Average per quarter of the X01 games the players played together.'),
    };
    const singleText = byPeriod
        ? (period === 'quarter'
            ? t('Average per quarter of the X01 games, with the trend over the last {{MOVING_PERIODS}} quarters and the overall average.', { MOVING_PERIODS })
            : t('Average per month of the X01 games, with the trend over the last {{MOVING_PERIODS}} months and the overall average.', { MOVING_PERIODS }))
        : t('Average of every X01 game, with the trend over the last {{MOVING_WINDOW}} games and the overall average.', { MOVING_WINDOW: MOVING_WINDOW });
    // average levels: where they change, and the next one to reach
    const withLevels = dated;
    const levelSeries = !withLevels ? [] : single
        ? [{ key: 'moving', values: rows.map(row => row.moving) }]
        // several players: the lines drawn are the averages, so the levels follow them, up and down
        : players.map((player, index) => {
            const key = `player${index + 1}`;
            return { key, values: rows.map(row => row[key] ?? null) };
        });
    const markersOf = (key) => {
        const entry = levelSeries.find(item => item.key === key);
        return entry ? levelMarker(new Map(levelChanges(entry.values).map(change => [change.index, change.level]))) : false;
    };
    const latestValues = levelSeries
        .filter(entry => !series.isHidden(entry.key) && !(single && series.isHidden('moving')))
        .map(entry => [...entry.values].reverse().find(value => value != null));
    const distinct = (levels) => [...new Map(levels.filter(Boolean).map(level => [level.min, level])).values()];
    // the level reached (Beginner starts at 0 and needs no line) and the next one
    const reachedLevels = distinct(latestValues.map(averageLevelOf)).filter(level => level.min > 0);
    // a level one player reached and another one is heading for is drawn once, as reached
    const nextLevels = distinct(latestValues.map(nextAverageLevel)).filter(level => !reachedLevels.some(reached => reached.min === level.min));
    const top = Math.max(0, ...nextLevels.map(level => level.min));
    const yDomain = [0, (dataMax) => Math.ceil((Math.max(dataMax, top) + 6) / 5) * 5];

    // a grouped point says how many games it stands for
    const tooltipLabel = (label, payload) => {
        const games = payload?.[0]?.payload?.games;
        return byPeriod && games ? `${label} · ${tn(games, '{{count}} game', '{{count}} games')}` : label;
    };

    return (
        <ChartCard
            title={title}
            description={description ?? (single ? singleText : STEP_TEXT[grouped?.step ?? 'game'])}
        >
            {rows.length === 0
                ? <p className="text-faint fs-7">{t('No averages yet.')}</p>
                : (
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="label" {...AXIS} minTickGap={24} />
                            <YAxis {...AXIS} domain={withLevels ? yDomain : [0, 'auto']} allowDataOverflow={false} />
                            <Tooltip
                                cursor={TOOLTIP.cursor}
                                content={(
                                    <ChartTooltip
                                        labelFormatter={tooltipLabel}
                                        formatValue={(value) => Math.round(Number(value) * 10) / 10}
                                        levelOf={withLevels ? (value) => averageLevelOf(value) : undefined}
                                    />
                                )}
                            />
                            {single
                                ? (
                                    <>
                                        <Area type="monotone" dataKey="average" name={byPeriod ? (period === 'quarter' ? t('Average per quarter') : t('Average per month')) : t('Game average')} stroke={PLAYER_COLORS[0]} fill={PLAYER_COLORS[0]} fillOpacity={0.18} strokeOpacity={0.5} dot={false} hide={series.isHidden('average')} />
                                        <Line legendType="plainline" type="monotone" dataKey="moving" name={t('Trend')} stroke="#efe6d0" strokeWidth={2.5} dot={withLevels ? markersOf('moving') : false} activeDot={{ r: 4 }} isAnimationActive={!withLevels} hide={series.isHidden('moving')} />
                                        {overall > 0 &&
                                            <ReferenceLine y={overall} stroke={PLAYER_COLORS[1]} strokeDasharray="6 4" label={{ value: `Ø ${overall}`, fill: PLAYER_COLORS[1], fontSize: 12, position: 'insideTopRight' }} />
                                        }
                                    </>
                                )
                                : players.map((player, index) => (
                                    <Line legendType="plainline" key={player.id} type="monotone" dataKey={`player${index + 1}`} name={player.nickname} stroke={PLAYER_COLORS[index]} strokeWidth={2.5} dot={withLevels ? markersOf(`player${index + 1}`) : { r: 2.5, fill: PLAYER_COLORS[index], strokeWidth: 0 }} isAnimationActive={!withLevels} connectNulls hide={series.isHidden(`player${index + 1}`)} />
                                ))
                            }
                            {reachedLevels.map(level => (
                                <ReferenceLine
                                    key={`reached-${level.min}`}
                                    y={level.min}
                                    stroke={level.color}
                                    strokeOpacity={0.45}
                                    label={{ value: `${level.name} · ${level.min}`, fill: level.color, fontSize: 11, position: 'insideBottomRight' }}
                                />
                            ))}
                            {nextLevels.map(level => (
                                <ReferenceLine
                                    key={level.min}
                                    y={level.min}
                                    stroke={level.color}
                                    strokeOpacity={0.7}
                                    strokeDasharray="3 5"
                                    label={{ value: `${level.name} · ${level.min}`, fill: level.color, fontSize: 11, position: 'insideTopLeft' }}
                                />
                            ))}
                            <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )
            }
        </ChartCard>
    );
};

export default AverageTrendChart;
