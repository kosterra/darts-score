import { Fragment } from 'react';
import { Panel } from 'primereact/panel';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useChartLegendInteraction from '@/hooks/useChartLegendInteraction';

const StatsAreaChart = ({ title, subtitle = '', data, xLabel = '', yLabel = '', players, labels, showLegend = false, className = '' }) => {
    const [areaProps, handleMouseEnter, handleMouseLeave, handleClick] = useChartLegendInteraction(labels.map(l => l.areaKey));

    const headerTemplate = () => (
        <div className="p-panel-header">
            <div>
                <div className="text-center fs-6 fw-semibold">{title}</div>
                <div className="text-center fs-8 fw-medium">{subtitle}</div>
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload?.length) {
            return (
                <div className="d-flex flex-column align-items-center bg-shade800">
                    <span className="bg-primary text-shade100 text-center fw-semibold fs-7 p-2 w-100">
                        {payload[0].payload?.desc || ''}
                    </span>
                    <div className="d-flex flex-column align-items-center p-2">
                        {payload.map((p, idx) => (
                            <span key={idx} className="text-shade100 fs-8 fw-semibold">
                                {`${players.length > 1 ? p.name + ': ' : ''}${p.value ?? 0}`}
                            </span>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Panel headerTemplate={headerTemplate} className={`mx-auto ${className}`}>
            <ResponsiveContainer width="100%" height={330}>
                <AreaChart data={data} margin={{ top: 30, right: 60, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="4 4" opacity={0.5} />
                    <YAxis type="number" domain={[0, 180]} label={{ value: yLabel, position: "center", angle: -90, dx: -20 }} />
                    {labels.map((label, idx) => (
                        <Fragment key={idx}>
                            <XAxis dataKey={label.xKey} dy={10} tick={{ fontSize: 1 }} label={{ value: xLabel, position: "bottom", dy: 0 }} />
                            <Area
                                name={players[idx]?.nickname || `Player ${idx + 1}`}
                                type="monotone"
                                dataKey={label.areaKey}
                                stroke={label.stroke}
                                strokeWidth={2}
                                fill={label.fill}
                                hide={areaProps[label.areaKey]}
                                strokeOpacity={areaProps.hover === label.areaKey || !areaProps.hover ? 0.8 : 0.2}
                                fillOpacity={areaProps.hover === label.areaKey || !areaProps.hover ? 0.8 : 0.2}
                                dot={{ stroke: label.stroke, strokeWidth: 2 }}
                            />
                        </Fragment>
                    ))}
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                    {showLegend && (
                        <Legend
                            onClick={handleClick}
                            onMouseOver={handleMouseEnter}
                            onMouseOut={handleMouseLeave}
                            verticalAlign='bottom'
                            formatter={(value, entry) => (
                                <span className="fs-7 fw-semibold text-shade500 pt-2">
                                    <i className="pi pi-circle-fill m-1" style={{ color: areaProps[entry.dataKey] ? '#fff' : entry.payload.fill }}></i>
                                    {value}
                                </span>
                            )}
                            iconType='circle'
                            iconSize={0}
                            wrapperStyle={{ bottom: -8, left: 15 }}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </Panel>
    );
};

export default StatsAreaChart;
