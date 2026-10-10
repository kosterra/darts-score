import StatsRadarChart from '../common/radar.chart';
import StatsScatterChart from '../common/scatter.chart';
import StatsBarChart from '../common/bar.chart';
import StatsLineChart from '../common/line.chart';
import ChartConfigOptions from '../common/chart.config.options';

const X01StatsCharts = ({ avg, sectionHits, checkouts, scoreRanges, players }) => {
    const { fillColors, strokeColor } = ChartConfigOptions;

    // Generische Funktion zur Label-Erstellung
    const generateLabels = (type, xKey = null) => {
        return players.map((_, idx) => {
            const key = `player${idx + 1}${type === 'Radar' ? 'Hit' : type === 'Bar' ? 'Count' : ''}`;
            return {
                [`${type.toLowerCase()}Key`]: key,
                ...(xKey && { xKey }),
                fill: fillColors.values[idx],
                stroke: type === 'Radar' || type === 'Scatter' || type === 'Bar' ? strokeColor : fillColors.values[idx]
            };
        });
    };

    return (
        <div className="container-fluid overflow-hidden p-0">
            <div className="row gy-3 d-flex justify-content-center align-items-center mt-2">
                <div className="col-12 col-xxl-6">
                    <StatsLineChart
                        title="Averages"
                        data={avg}
                        players={players}
                        labels={generateLabels('Line', 'label')}
                        showLegend
                    />
                </div>
                <div className="col-12 col-xxl-6">
                    <StatsRadarChart
                        title="Section Hits"
                        data={sectionHits}
                        players={players}
                        axisKey="section"
                        labels={generateLabels('Radar', 'label')}
                        showLegend
                    />
                </div>
            </div>

            <div className="row gy-3 d-flex justify-content-center align-items-center mt-2">
                <div className="col-12 col-xxl-6">
                    <StatsScatterChart
                        title="Checkouts"
                        data={checkouts}
                        players={players}
                        xKey="total"
                        yKey="hit"
                        zKey="rate"
                        xLabel="Total Attempts"
                        yLabel="Hit"
                        labels={generateLabels('Scatter')}
                        showLegend
                    />
                </div>
                <div className="col-12 col-xxl-6">
                    <StatsBarChart
                        title="Score Ranges"
                        data={scoreRanges}
                        players={players}
                        yLabel="Count"
                        labels={generateLabels('Bar', 'range')}
                        showLegend
                    />
                </div>
            </div>
        </div>
    );
};

export default X01StatsCharts;
