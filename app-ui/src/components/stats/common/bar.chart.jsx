import { Fragment } from 'react';
import { Panel } from 'primereact/panel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useChartLegendInteraction from '@/hooks/useChartLegendInteraction';

const StatsBarChart = ({ title, subtitle = '', data, xLabel = '', yLabel = '', players, labels, showLegend = false, className = '' }) => {
    const [barProps, handleMouseEnter, handleMouseLeave, handleClick] = useChartLegendInteraction(labels.map(l => l.barKey));

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
                        {payload[0].payload?.range || ''}
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
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <YAxis label={{ value: yLabel, position: "center", angle: -90, dx: -20 }} />
                    {labels.map((label, idx) => (
                        <Fragment key={idx}>
                            <XAxis
                                type="category"
                                dataKey={label.xKey}
                                interval={0}
                                tick={{ fontSize: 1, dx: -4, textAnchor: "end" }}
                                label={{ value: xLabel, position: "bottom" }}
                                padding={{ top: 20 }}
                                angle={-70}
                            />
                            <Bar
                                key={idx}
                                name={players[idx]?.nickname || `Player ${idx + 1}`}
                                dataKey={label.barKey}
                                fill={label.fill}
                                hide={barProps[label.barKey]}
                                fillOpacity={barProps.hover === label.barKey || !barProps.hover ? 0.8 : 0.2}
                            />
                        </Fragment>
                    ))}
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', fill: "transparent" }} />
                    {showLegend && (
                        <Legend
                            onClick={handleClick}
                            onMouseOver={handleMouseEnter}
                            onMouseOut={handleMouseLeave}
                            verticalAlign='bottom'
                            formatter={(value, entry) => (
                                <span className="fs-7 fw-semibold text-shade500 pt-2">
                                    <i className="pi pi-circle-fill m-1" style={{ color: barProps[entry.dataKey] ? '#fff' : entry.payload.fill }}></i>
                                    {value}
                                </span>
                            )}
                            iconType='circle'
                            iconSize={0}
                            wrapperStyle={{ bottom: -8, left: 15 }}
                        />
                    )}
                </BarChart>
            </ResponsiveContainer>
        </Panel>
    );
};

export default StatsBarChart;
