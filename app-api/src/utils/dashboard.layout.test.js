import { describe, it, expect } from 'vitest';
import { layoutFromWidgets, normalizeLayout, personalFromOwn, MAX_WIDGETS } from './dashboard.layout.js';

describe('dashboard layout', () => {
    it('keeps valid widgets in their order, each once, with a known width', () => {
        expect(normalizeLayout([
            { id: 'timeline', size: 'L' }, { id: 'me', size: 'S' }, { id: 'timeline', size: 'F' },
            { id: 'bad id!', size: 'S' }, { id: 'records', size: 'XXL' }, { size: 'M' }, 'totals',
        ])).toEqual([{ id: 'timeline', size: 'L' }, { id: 'me', size: 'S' }, { id: 'records', size: 'M' }]);
        // a height only when it is one of the capped ones
        expect(normalizeLayout([{ id: 'timeline', size: 'L', height: 'M' }, { id: 'me', size: 'S', height: 'auto' }, { id: 'records', size: 'M', height: 'XXL' }]))
            .toEqual([{ id: 'timeline', size: 'L', height: 'M' }, { id: 'me', size: 'S' }, { id: 'records', size: 'M' }]);
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

describe('personalFromOwn', () => {
    const red = { club: 'c1', layout: [{ id: 'me', size: 'S' }, { id: 'records', size: 'M' }] };
    const blue = { club: 'c2', layout: [{ id: 'timeline', size: 'L' }, { id: 'favourites', size: 'S' }] };

    it('puts Up next and the favourites on top of the arrangement made last', () => {
        expect(personalFromOwn([red, blue])).toEqual([{ id: 'upNext', size: 'F' }, { id: 'favourites', size: 'L' }, { id: 'timeline', size: 'L' }]);
    });

    it('takes the one of the default club first', () => {
        expect(personalFromOwn([red, blue], 'c1').map(item => item.id)).toEqual(['upNext', 'favourites', 'me', 'records']);
    });

    it('is null without an arrangement', () => {
        expect(personalFromOwn([])).toBeNull();
        expect(personalFromOwn(undefined)).toBeNull();
        expect(personalFromOwn([{ club: 'c1', layout: [] }])).toBeNull();
    });
});
