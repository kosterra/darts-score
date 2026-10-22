import { useMemo } from 'react';
import { Panel } from 'primereact/panel';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { clubFormPerMonth } from '../../../utils/club.charts';
import { AXIS, GRID, TOOLTIP } from '../../stats/charts/chart.theme';
import { t } from '../../../utils/i18n';

/**
 * The club's X01 average per month over the last year.
 */
const ClubFormWidget = ({ widget, gameLog }) => {
    const data = useMemo(() => clubFormPerMonth(gameLog), [gameLog]);
    const hasData = data.some(entry => entry.average != null);
    return (
        <Panel header={widget.title} className="h-100">
            <p className="text-faint fs-8 mt-0 mb-2">{t('The club\'s X01 three-dart average per month; months without X01 games stay empty.')}</p>
            {hasData
                ? (
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                                <defs>
                                    <linearGradient id="club-form-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7ecca5" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#7ecca5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...GRID} />
                                <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
                                <YAxis {...AXIS} domain={[0, 'auto']} />
                                <Tooltip {...TOOLTIP} formatter={(value) => [value, t('Average')]} />
                                <Area dataKey="average" type="monotone" stroke="#7ecca5" strokeWidth={2} fill="url(#club-form-fill)" dot={{ r: 2.5, fill: '#7ecca5', strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )
                : <p className="text-subtle m-0">{t('No finished X01 games in the last year.')}</p>
            }
        </Panel>
    );
};

export default ClubFormWidget;
