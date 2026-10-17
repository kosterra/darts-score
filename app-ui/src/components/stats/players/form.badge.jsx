import { Line, LineChart, YAxis } from 'recharts';
import { FaArrowTrendDown, FaArrowTrendUp, FaArrowRightLong } from 'react-icons/fa6';

const TRENDS = {
    up: { icon: FaArrowTrendUp, label: 'rising', className: 'is-up' },
    down: { icon: FaArrowTrendDown, label: 'falling', className: 'is-down' },
    steady: { icon: FaArrowRightLong, label: 'steady', className: 'is-steady' },
};

const signed = (value) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value).toFixed(1)}`;

/**
 * A player's current X01 form: rising, falling or steady (the average of their
 * last five games against the five before) with their latest averages as a
 * small line in the player's colour. "align" is 'start' or 'end'.
 */
const FormBadge = ({ form, color, align = 'start' }) => {
    if (!form) return null;
    if (!form.games) return <span className="form-badge text-faint fs-8">No X01 games yet</span>;

    const trend = TRENDS[form.trend];
    const title = trend
        ? `X01 form: ${form.recentAverage} average in the last 5 games, ${signed(form.change)} against the 5 games before (${form.previousAverage}).`
        : `X01 form: ${form.recentAverage} average; a trend needs more than 5 games.`;
    const points = form.latest.map((average, index) => ({ index, average }));

    return (
        <span className={`form-badge ${align === 'end' ? 'flex-row-reverse' : ''}`} title={title}>
            {points.length > 1 &&
                <LineChart width={84} height={26} data={points} margin={{ top: 3, right: 2, bottom: 3, left: 2 }} aria-hidden="true">
                    <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                    <Line type="monotone" dataKey="average" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
            }
            {trend
                ? (
                    <span className={`form-trend ${trend.className}`}>
                        <trend.icon aria-hidden="true" />
                        <span>{trend.label}</span>
                        <span className="form-change">{signed(form.change)}</span>
                    </span>
                )
                : <span className="text-faint fs-8">Too few games for a trend</span>
            }
        </span>
    );
};

export default FormBadge;
