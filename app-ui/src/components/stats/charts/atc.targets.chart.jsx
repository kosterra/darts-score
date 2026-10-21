import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartCard from './chart.card';
import { TARGET_NAMES } from '../../../utils/atc.darts';
import { AXIS, BAR_OPACITY, GRID, PLAYER_COLORS, TOOLTIP } from './chart.theme';
import { t } from '../../../utils/i18n';

// how many of the hardest targets stand out
const HARDEST = 3;
const HARD_COLOR = '#f97316';

/**
 * Around the Clock with the fewest darts: the average darts a player needs for
 * each target, the hardest ones highlighted.
 * perTarget: 21 averages, 1 to 20 and the bull
 */
const AtcTargetsChart = ({ perTarget = [], trainings = 0 }) => {
    const rows = perTarget.map((darts, index) => ({ target: TARGET_NAMES[index], darts }));
    const hardest = new Set([...rows].filter(row => row.darts > 1).sort((a, b) => b.darts - a.darts).slice(0, HARDEST).map(row => row.target));

    return (
        <ChartCard
            title={t('Around the Clock · darts per number')}
            description={t('Average darts needed for each number over {{trainings}} {{value}} with the fewest darts; one is a hit with the first dart. The hardest numbers stand out.', { trainings: trainings, value: trainings === 1 ? 'round' : 'rounds' })}
        >
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="target" {...AXIS} interval={0} tick={{ ...AXIS.tick, fontSize: 10 }} />
                    <YAxis {...AXIS} width={32} allowDecimals />
                    <Tooltip {...TOOLTIP} formatter={(value) => [t('{{value}} darts', { value: value }), t('Average')]} />
                    <Bar dataKey="darts" fillOpacity={BAR_OPACITY} radius={[4, 4, 0, 0]}>
                        {rows.map(row => <Cell key={row.target} fill={hardest.has(row.target) ? HARD_COLOR : PLAYER_COLORS[0]} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

export default AtcTargetsChart;
