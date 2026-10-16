import ChartConfigOptions from '../common/chart.config.options';

/**
 * Shared look of the statistics charts on the dark theme.
 */
export const PLAYER_COLORS = ChartConfigOptions.fillColors.values;

// Bars are drawn a little see-through, so they sit calmly on the dark panels
export const BAR_OPACITY = 0.55;

export const AXIS = {
    stroke: '#5c5c5c',
    tick: { fill: '#9a9a9a', fontSize: 12 },
    tickLine: false,
};

export const GRID = { stroke: '#313131', strokeDasharray: '3 3', vertical: false };

export const TOOLTIP = {
    contentStyle: { background: '#292929', border: '1px solid #3d3d3d', borderRadius: 5, color: '#d4d4d4' },
    labelStyle: { color: '#d4d4d4', fontWeight: 600 },
    itemStyle: { color: '#d4d4d4' },
    cursor: { fill: 'rgba(255, 255, 255, 0.04)' },
};

export const LEGEND = { wrapperStyle: { color: '#b6b6b6', fontSize: 12, paddingTop: 8 } };

/**
 * Hits per section for one player out of the multi-player format
 * ({ section, player1S, player1D, … }), as the heatmap wants it ({ section, S, D, T }).
 */
export const sectionHitsOf = (sectionHits, index) => sectionHits.map(entry => ({
    section: entry.section,
    S: entry[`player${index + 1}S`] ?? 0,
    D: entry[`player${index + 1}D`] ?? 0,
    T: entry[`player${index + 1}T`] ?? 0,
}));
