/**
 * The tooltip of every chart: what the point is (e.g. a date) and every value
 * with a dot in the colour of its line or bar, optionally with the level of
 * the value as a small badge ("levelOf(value, entry)" gives { name, color,
 * icon } or nothing). Recharts hands over the Tooltip's own "formatter" and
 * "labelFormatter" too, so a chart keeps its formats (e.g. "67 %").
 */
const ChartTooltip = ({ active, payload, label, labelFormatter, formatter, formatValue = (value) => value, levelOf }) => {
    const rows = (payload ?? []).filter(entry => entry.value != null && entry.value !== '' && !Number.isNaN(Number(entry.value)));
    if (!active || !rows.length) return null;
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-label">{labelFormatter ? labelFormatter(label, payload) : label}</div>
            {rows.map((entry, index) => {
                const level = levelOf?.(entry.value, entry);
                const Icon = level?.icon;
                // a formatter may give the value or [value, name]
                const formatted = formatter ? formatter(entry.value, entry.name, entry, index, payload) : formatValue(entry.value);
                const [value, name] = Array.isArray(formatted) ? formatted : [formatted, entry.name];
                return (
                    <div key={`${entry.dataKey}-${index}`} className="chart-tooltip-row">
                        <span className="chart-tooltip-dot" style={{ background: entry.color ?? entry.stroke ?? entry.fill ?? entry.payload?.fill }} />
                        <span className="chart-tooltip-name">{name}</span>
                        <span className="chart-tooltip-value">{value}</span>
                        {level &&
                            <span className="chart-tooltip-level" style={{ '--level-color': level.color }}>
                                {Icon && <Icon aria-hidden="true" />}{level.name}
                            </span>
                        }
                    </div>
                );
            })}
        </div>
    );
};

export default ChartTooltip;
