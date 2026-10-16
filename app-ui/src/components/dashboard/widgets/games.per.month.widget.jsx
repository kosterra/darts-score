import { useMemo } from 'react';
import { Panel } from 'primereact/panel';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { gamesPerMonth } from '../../../utils/club.charts';
import { AXIS, BAR_OPACITY, GRID, TOOLTIP, LEGEND } from '../../stats/charts/chart.theme';

const TYPES = [
    { key: 'x01', name: 'X01', color: '#7ecca5' },
    { key: 'cricket', name: 'Cricket', color: '#d4c783' },
    { key: 'elimination', name: 'Elimination', color: '#c3a9e6' },
];

/**
 * Finished games of the last twelve months, stacked by game type.
 */
const GamesPerMonthWidget = ({ widget, gameLog }) => {
    const data = useMemo(() => gamesPerMonth(gameLog), [gameLog]);
    return (
        <Panel header={widget.title} className="h-100">
            <p className="text-faint fs-8 mt-0 mb-2">Finished games per month, by game type.</p>
            <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
                        <YAxis {...AXIS} allowDecimals={false} />
                        <Tooltip {...TOOLTIP} />
                        <Legend {...LEGEND} />
                        {TYPES.map((type, index) => (
                            <Bar key={type.key} dataKey={type.key} name={type.name} stackId="games" fill={type.color} fillOpacity={BAR_OPACITY}
                                radius={index === TYPES.length - 1 ? [3, 3, 0, 0] : 0} maxBarSize={28} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Panel>
    );
};

export default GamesPerMonthWidget;
