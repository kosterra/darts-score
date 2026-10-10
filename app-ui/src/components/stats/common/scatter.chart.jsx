import { Panel } from 'primereact/panel';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Legend } from 'recharts';
import useChartLegendInteraction from '@/hooks/useChartLegendInteraction';

const StatsScatterChart = ({ title, subtitle = '', data, players, xKey, yKey, zKey, labels, xLabel = '', yLabel = '', showLegend = false, className = '' }) => {
    const [scatterProps, handleMouseEnter, handleMouseLeave, handleClick] = useChartLegendInteraction(labels.map(l => l.scatterKey));

    const headerTemplate = () => (
        <div className="p-panel-header">
            <div>
                <div className="text-center fs-6 fw-semibold">{title}</div>
                <div className="text-center fs-8 fw-medium">{subtitle}</div>
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="d-flex flex-column align-items-center bg-shade800">
                    <span className="bg-primary text-shade100 text-center fw-semibold fs-7 p-2 w-100">
                        {`${payload[0].payload.section}`}
                    </span>
                    <div className="d-flex flex-column align-items-center p-2">
                        <span className="text-shade100 fs-8 fw-semibold pb-1">
                            {`${payload[0].payload.rate + '%'}`}
                        </span>
                        <span className="text-shade100 fs-9 fw-semibold">
                            {`${'(' + payload[0].payload.hit + '/' + payload[0].payload.total + ')'}`}
                        </span>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <Panel headerTemplate={headerTemplate} className={`mx-auto ${className}`}>
            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <XAxis type="number" dataKey={xKey} label={{ value: xLabel, position: "bottom", dy: 0 }} tickLine={false} tick={false} />
                    <YAxis type="number" dataKey={yKey} label={{ value: yLabel, position: "center", angle: -90, dx: 0 }} tickLine={false} tick={false} />
                    <ZAxis type="number" dataKey={zKey} range={[100, 1000]} />
                    {labels.map((label, idx) => (
                        <Scatter
                            key={idx}
                            name={players[idx]?.nickname || `Player ${idx + 1}`}
                            data={data[label.scatterKey] ?? []}
                            dataKey={label.scatterKey}
                            stroke={label.stroke}
                            fill={label.fill}
                            hide={scatterProps[label.scatterKey]}
                            strokeOpacity={scatterProps.hover === label.scatterKey || !scatterProps.hover ? 0.8 : 0.2}
                            fillOpacity={scatterProps.hover === label.scatterKey || !scatterProps.hover ? 0.8 : 0.2}
                            line={false}
                            dot={{ stroke: label.stroke, strokeWidth: 2 }}
                        />
                    ))}
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', fill: "transparent" }} />
                    {showLegend && (
                        <Legend
                            onClick={handleClick}
                            onMouseOver={handleMouseEnter}
                            onMouseOut={handleMouseLeave}
                            verticalAlign='bottom'
                            formatter={(value, entry) => (
                                <span className="fs-7 fw-semibold text-shade500">
                                    <i className="pi pi-circle-fill m-1" style={{ color: scatterProps[entry.dataKey] ? '#fff' : entry.payload.fill }}></i>
                                    {value}
                                </span>
                            )}
                            iconType='circle'
                            iconSize={0}
                            wrapperStyle={{ bottom: -8, left: 15 }}
                        />
                    )}
                </ScatterChart>
            </ResponsiveContainer>
        </Panel>
    );
};

export default StatsScatterChart;
