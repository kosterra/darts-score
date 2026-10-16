import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';

import ChartCard from './chart.card';
import { AXIS, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';

const MODES = ['Single', 'Double', 'Triple', 'All'];

// training times are stored in hundredths of a second
const formatTime = (hundredths) => {
    if (hundredths == null) return '';
    const seconds = hundredths / 100;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
};

/**
 * Best Around the Clock time per mode as it improved over time.
 * progress: { Single: [{ date, timeMs, best }], … }
 */
const TrainingProgressChart = ({ progress = {} }) => {
    const modes = MODES.filter(mode => progress[mode]?.length);
    // one row per training, carrying each mode's best time so far
    const events = modes.flatMap(mode => progress[mode].map(entry => ({ mode, ...entry })))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    const current = {};
    const rows = events.map(event => {
        current[event.mode] = event.best;
        return { label: dayjs(event.date).format('DD.MM.YY'), ...current };
    });

    return (
        <ChartCard title="Around the Clock" description="Best time per mode, and how it improved with every training. Lower is better.">
            {rows.length === 0
                ? <p className="text-faint fs-7">No trainings yet.</p>
                : (
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="label" {...AXIS} minTickGap={16} />
                            <YAxis {...AXIS} tickFormatter={formatTime} reversed={false} domain={['auto', 'auto']} width={56} />
                            <Tooltip {...TOOLTIP} formatter={(value) => formatTime(value)} />
                            {modes.map((mode, index) => (
                                <Line key={mode} type="stepAfter" dataKey={mode} name={mode} stroke={PLAYER_COLORS[index]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                            ))}
                            <Legend {...LEGEND} />
                        </LineChart>
                    </ResponsiveContainer>
                )
            }
        </ChartCard>
    );
};

export default TrainingProgressChart;
