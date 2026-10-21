import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartCard from './chart.card';
import useHiddenSeries from './use.hidden.series';
import { AXIS, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';
import { t } from '../../../utils/i18n';

/**
 * A value of every player over the rounds of a game, one line per player.
 * data: [{ round, [playerId]: value }] from round 0; "target" draws a line
 * at the value to reach, "unit" follows the values in the tooltip and
 * "step" names what is counted ("Round", or "Visit" for every visit).
 */
const RoundsLineChart = ({ title, description, data, players, max, target, unit, step = t('Round') }) => {
    const series = useHiddenSeries();
    return (
        <ChartCard title={title} description={description}>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="round" {...AXIS} allowDecimals={false} label={{ value: step, position: 'insideBottomRight', offset: -2, fill: '#7a7a7a', fontSize: 11 }} />
                    <YAxis {...AXIS} domain={[0, max ?? target ?? 'auto']} allowDecimals={false} />
                    {target && <ReferenceLine y={target} stroke="#ffc94d" strokeDasharray="4 4" label={{ value: `Target ${target}`, position: 'insideTopLeft', fill: '#ffc94d', fontSize: 11 }} />}
                    <Tooltip {...TOOLTIP} labelFormatter={(round) => round === 0 ? t('Start') : `${step} ${round}`} formatter={(value) => unit ? `${value} ${unit}` : value} />
                    {players.map((player, index) => (
                        <Line key={player.id} type="linear" dataKey={player.id} name={player.nickname} stroke={PLAYER_COLORS[index]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} hide={series.isHidden(player.id)} />
                    ))}
                    {players.length > 1 && <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />}
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

export default RoundsLineChart;
