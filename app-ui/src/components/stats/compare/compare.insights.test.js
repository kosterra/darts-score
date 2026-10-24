import { describe, it, expect } from 'vitest';
import { insightsOf } from './compare.insights';

const players = [{ nickname: 'Anna' }, { nickname: 'Ben' }];

describe('the comparison in words', () => {
    it('says the biggest difference first and then one where the other leads', () => {
        const rows = [
            { key: 'average', label: '3-dart average', values: [58.2, 51.9], texts: ['58.2', '51.9'], weight: 3 },
            { key: 'checkout', label: 'Checkout', values: [0.33, 0.41], texts: ['33 %', '41 %'], weight: 2, formatLead: (d) => `${Math.round(d * 100)} %` },
            { key: '180', label: '180s', values: [4, 3] },
        ];
        const [first, second] = insightsOf(rows, players);
        expect(second.text).toContain('Ben');
        expect([first.key, second.key]).toEqual(expect.arrayContaining(['checkout']));
        expect(insightsOf(rows, players).some(insight => insight.text.includes('6.3'))).toBe(true);
    });

    it('fewer is better where it should be, and equal or empty figures say nothing', () => {
        const rows = [
            { key: 'dartsPerLeg', label: 'Darts per leg', values: [21, 18], lowerIsBetter: true },
            { key: 'same', label: 'Same', values: [5, 5] },
            { key: 'none', label: 'None', values: [0, 0] },
            { key: 'neutral', label: 'Darts thrown', values: [900, 400], neutral: true },
        ];
        const insights = insightsOf(rows, players);
        expect(insights).toHaveLength(1);
        expect(insights[0].text).toContain('Ben');
        expect(insights[0].text).toContain('18');
    });
});
