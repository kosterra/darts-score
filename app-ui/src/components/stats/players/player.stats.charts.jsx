import StatsRadarChart from '../common/radar.chart';
import StatsScatterChart from '../common/scatter.chart';
import StatsBarChart from '../common/bar.chart';
import StatsAreaChart from '../common/area.chart';
import ChartConfigOptions from '../common/chart.config.options';

const PlayerStatsCharts = ({ playerStats = {}, players = [] }) => {
    const {
        avg = {},
        sectionHits = [],
        checkouts = {},
        scoreRanges = []
    } = playerStats;

    // Farben aus der globalen Chart-Konfiguration beziehen
    const colors = ChartConfigOptions.fillColors?.values || [
        '#528b6e', '#d4c783', '#7baabf', '#c07c40'
    ];

    const charts = [
        {
            key: 'average',
            Component: StatsAreaChart,
            props: {
                title: 'Average',
                subtitle: 'X01',
                data: avg.perGameX01 || [],
                players,
                labels: [
                    { areaKey: 'value', xkey: 'label', fill: colors[0], stroke: colors[1] }
                ]
            },
        },
        {
            key: 'sectionHits',
            Component: StatsRadarChart,
            props: {
                title: 'Section Hits',
                subtitle: 'X01',
                data: sectionHits,
                players,
                axisKey: 'section',
                labels: [
                    { radarKey: 'hit', fill: colors[0], stroke: colors[1] }
                ]
            },
        },
        {
            key: 'checkouts',
            Component: StatsScatterChart,
            props: {
                title: 'Checkouts',
                subtitle: 'X01',
                data: { player: checkouts.rates || [] },
                players,
                xKey: 'total',
                yKey: 'hit',
                zKey: 'rate',
                xLabel: 'Total Attempts',
                yLabel: 'Hit',
                labels: [
                    { scatterKey: 'player', fill: colors[0], stroke: colors[1] }
                ]
            },
        },
        {
            key: 'scoreRanges',
            Component: StatsBarChart,
            props: {
                title: 'Score Ranges',
                subtitle: 'X01',
                data: scoreRanges,
                players,
                yLabel: 'Count',
                labels: [
                    { barKey: 'count', xKey: 'range', fill: colors[0] }
                ]
            },
        },
    ];

    return (
        <div className="container overflow-hidden p-0">
            <div className="row gy-4 mt-4 d-flex space-between">
                {charts.slice(0, 2).map(({ key, Component, props }) => (
                    <div key={key} className="col-12 col-xl-6">
                        <Component {...props} />
                    </div>
                ))}
            </div>
            <div className="row gy-4 mt-2 d-flex space-between">
                {charts.slice(2).map(({ key, Component, props }) => (
                    <div key={key} className="col-12 col-xl-6">
                        <Component {...props} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerStatsCharts;
