import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartCard from './chart.card';
import useHiddenSeries from './use.hidden.series';
import { AXIS, GRID, LEGEND, PLAYER_COLORS, TOOLTIP } from './chart.theme';
import { formatTrainingTime } from '../../../utils/training.time';
import { t } from '../../../utils/i18n';
import { formatDate } from '../../../utils/dates';

const MODES = ['Single', 'Double', 'Triple', 'All'];


/**
 * Best Around the Clock result per mode as it improved over time: the time,
 * or with format and texts the fewest darts.
 * progress: { Single: [{ date, best }], … }
 */
const TrainingProgressChart = ({
    progress = {},
    title = 'Around the Clock',
    description = t('Best time per mode, and how it improved with every training. Lower is better.'),
    format = (value) => formatTrainingTime(value, 1),
}) => {
    const series = useHiddenSeries();
    const modes = MODES.filter(mode => progress[mode]?.length);
    // one row per training, carrying each mode's best time so far
    const events = modes.flatMap(mode => progress[mode].map(entry => ({ mode, ...entry })))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    const current = {};
    const rows = events.map(event => {
        current[event.mode] = event.best;
        return { label: formatDate(event.date, { year: 'short' }), ...current };
    });

    return (
        <ChartCard title={title} description={description}>
            {rows.length === 0
                ? <p className="text-faint fs-7">{t('No trainings yet.')}</p>
                : (
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="label" {...AXIS} minTickGap={16} />
                            <YAxis {...AXIS} tickFormatter={format} reversed={false} domain={['auto', 'auto']} width={56} />
                            <Tooltip {...TOOLTIP} formatter={format} />
                            {modes.map((mode, index) => (
                                <Line legendType="plainline" key={mode} type="stepAfter" dataKey={mode} name={mode} stroke={PLAYER_COLORS[index]} strokeWidth={2.5} dot={{ r: 2.5, fill: PLAYER_COLORS[index], strokeWidth: 0 }} connectNulls hide={series.isHidden(mode)} />
                            ))}
                            <Legend {...LEGEND} onClick={series.toggle} formatter={series.legendLabel} />
                        </LineChart>
                    </ResponsiveContainer>
                )
            }
        </ChartCard>
    );
};

export default TrainingProgressChart;
