import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';

import { TOOLTIP } from './chart.theme';

globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('TOOLTIP', () => {
    it('gives every chart the tooltip card with a dot per value, bars included', async () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        await act(async () => {
            root.render(
                <BarChart width={400} height={200} data={[{ range: '180', p0: 12, p1: 7 }]}>
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip {...TOOLTIP} defaultIndex={0} active formatter={(value) => `${value} %`} />
                    <Bar dataKey="p0" name="Hoorli" fill="#5fa883" />
                    <Bar dataKey="p1" name="Häns" fill="#d4c783" />
                </BarChart>
            );
        });
        const tooltip = host.querySelector('.chart-tooltip');
        expect(tooltip).not.toBeNull();
        expect(tooltip.textContent).toContain('Hoorli');
        expect(tooltip.textContent).toContain('12 %');
        const dots = [...tooltip.querySelectorAll('.chart-tooltip-dot')].map(dot => dot.style.background);
        expect(dots).toEqual(['rgb(95, 168, 131)', 'rgb(212, 199, 131)']);
        root.unmount();
    });
});
