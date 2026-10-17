import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ChartTooltip from './chart.tooltip';
import { averageLevelOf } from '../../../utils/average.levels';

// the tests compile JSX the classic way, which needs React at hand
globalThis.React = React;

const payload = [
    { dataKey: 'player1', name: 'Häns', value: 169.84, color: '#d4c783' },
    { dataKey: 'player2', name: 'Patch Panther', value: 63, color: '#5fa883' },
    { dataKey: 'player3', name: 'Nobody', value: null, color: '#fff' },
];

describe('ChartTooltip', () => {
    it('shows the label, every value with its colour and its level', () => {
        const html = renderToStaticMarkup(
            <ChartTooltip active payload={payload} label="22.12.23" formatValue={(v) => Math.round(v * 10) / 10} levelOf={averageLevelOf} />
        );
        expect(html).toContain('22.12.23');
        expect(html).toContain('Häns');
        expect(html).toContain('169.8');
        expect(html).toContain('Elite');
        expect(html).toContain('Patch Panther');
        expect(html).toContain('Pro');
        expect(html).toContain('background:#d4c783');
        // values without a number are left out
        expect(html).not.toContain('Nobody');
    });

    it('shows nothing when not active', () => {
        expect(renderToStaticMarkup(<ChartTooltip active={false} payload={payload} label="x" />)).toBe('');
    });

    it('keeps the chart\'s own formats and colours bars by their fill', () => {
        const html = renderToStaticMarkup(
            <ChartTooltip active label="Mar 25" payload={[{ dataKey: 'winRate', name: 'Win rate', value: 67, fill: '#5fa883' }]} formatter={(value, name) => name === 'Win rate' ? `${value} %` : value} />
        );
        expect(html).toContain('67 %');
        expect(html).toContain('background:#5fa883');
    });

    it('shows a level only where levelOf gives one, as the Form chart does for the average', () => {
        const html = renderToStaticMarkup(
            <ChartTooltip
                active
                label="Mar 25"
                payload={[{ dataKey: 'winRate', name: 'Win rate', value: 67, color: '#5fa883' }, { dataKey: 'average', name: 'Average', value: 52, color: '#d4c783' }]}
                levelOf={(value, entry) => entry.dataKey === 'average' ? averageLevelOf(value) : null}
            />
        );
        expect(html.match(/chart-tooltip-level/g)).toHaveLength(1);
        expect(html).toContain('Semi-pro');
    });
});
