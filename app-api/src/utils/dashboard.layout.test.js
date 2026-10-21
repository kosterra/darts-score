import { describe, it, expect } from 'vitest';
import { layoutFromWidgets, normalizeLayout, MAX_WIDGETS } from './dashboard.layout.js';

describe('dashboard layout', () => {
    it('keeps valid widgets in their order, each once, with a known width', () => {
        expect(normalizeLayout([
            { id: 'timeline', size: 'L' }, { id: 'me', size: 'S' }, { id: 'timeline', size: 'F' },
            { id: 'bad id!', size: 'S' }, { id: 'records', size: 'XXL' }, { size: 'M' }, 'totals',
        ])).toEqual([{ id: 'timeline', size: 'L' }, { id: 'me', size: 'S' }, { id: 'records', size: 'M' }]);
        expect(normalizeLayout(null)).toEqual([]);
        expect(normalizeLayout(Array.from({ length: 50 }, (_, index) => ({ id: `w${index}`, size: 'S' })))).toHaveLength(MAX_WIDGETS);
    });

    it('turns the widget lists clubs stored before into layouts with the widths they had', () => {
        expect(layoutFromWidgets(['me', 'totals', 'leaderMostWins', 'timeline'])).toEqual([
            { id: 'me', size: 'S' }, { id: 'totals', size: 'F' }, { id: 'leaderMostWins', size: 'S' }, { id: 'timeline', size: 'L' },
        ]);
        expect(layoutFromWidgets(undefined)).toEqual([]);
    });
});
