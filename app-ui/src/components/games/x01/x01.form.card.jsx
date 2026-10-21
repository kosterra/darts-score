import { useMemo } from 'react';
import { Bar, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { FaArrowTrendUp, FaArrowTrendDown, FaArrowRightLong } from 'react-icons/fa6';

import { formOf } from '../../../utils/x01.form';
import { PLAYER_COLORS, TOOLTIP } from '../../stats/charts/chart.theme';
import { t } from '../../../utils/i18n';

const TRENDS = {
    up: { label: t('Getting better'), icon: FaArrowTrendUp, className: 'is-up' },
    down: { label: t('Dropping'), icon: FaArrowTrendDown, className: 'is-down' },
    steady: { label: t('Steady'), icon: FaArrowRightLong, className: 'is-steady' },
};

const formatAverage = (value) => value == null ? '–' : value.toFixed(1);

// the visit in the look of the other chart tooltips
const VisitTooltip = ({ active, payload, color }) => {
    if (!active || !payload?.length) return null;
    const visit = payload[0].payload;
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-label">{t('Visit')}{' '}{visit.index}{' '}{t('· Leg')}{' '}{visit.leg}</div>
            <div className="chart-tooltip-row">
                <span className="chart-tooltip-dot" style={{ background: '#9a9a9a' }} />
                <span className="chart-tooltip-name">{t('Score')}</span>
                <span className="chart-tooltip-value">{visit.score}</span>
            </div>
            <div className="chart-tooltip-row">
                <span className="chart-tooltip-dot" style={{ background: color }} />
                <span className="chart-tooltip-name">{t('Last 3 average')}</span>
                <span className="chart-tooltip-value">{formatAverage(visit.rolling)}</span>
            </div>
        </div>
    );
};

/**
 * How a player is doing in this game: every visit as a bar, the average of
 * the last three visits as a line, the game average as a dashed line, and
 * whether they are getting better or worse.
 */
const X01FormCard = ({ game, playerId }) => {
    const form = useMemo(() => formOf(game, playerId), [game, playerId]);
    const color = PLAYER_COLORS[game.players.indexOf(playerId) % PLAYER_COLORS.length];
    const trend = TRENDS[form.trend];

    const figures = [
        [t('Last 3'), form.recentAverage],
        ['Leg', form.legAverage],
        ['Game', form.gameAverage],
    ];

    return (
        <div className="x01-form-card rounded-2 p-2">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-subtle fs-8 fw-semibold">{t('Form')}</span>
                {trend && (
                    <span className={`x01-form-trend ${trend.className}`} title={t('The last 5 visits compared with the game average')}>
                        <trend.icon aria-hidden="true" /> {trend.label}
                    </span>
                )}
            </div>
            <div className="d-flex justify-content-around text-center">
                {figures.map(([label, value]) => (
                    <div key={label} className="d-flex flex-column">
                        <span className="text-default fw-semibold fs-6" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAverage(value)}</span>
                        <span className="text-faint fs-9">{label}</span>
                    </div>
                ))}
            </div>
            {form.visits.length > 1
                ? (
                    <div style={{ height: 64 }} className="mt-1" aria-label={t('Score of every visit with the average of the last three')}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={form.visits} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                                <YAxis hide domain={[0, 180]} />
                                <Tooltip content={<VisitTooltip color={color} />} cursor={TOOLTIP.cursor} />
                                <Bar dataKey="score" fill="#ffffff" fillOpacity={0.12} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                                {form.gameAverage != null && <ReferenceLine y={form.gameAverage} stroke="#9a9a9a" strokeDasharray="3 3" />}
                                <Line dataKey="rolling" stroke={color} strokeWidth={2} dot={false} type="monotone" isAnimationActive={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )
                : <div className="text-faint fs-9 text-center mt-1">{t('The trend shows after a few visits.')}</div>
            }
        </div>
    );
};

export default X01FormCard;
