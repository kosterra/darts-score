import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FigureValue from './figure.value';

const html = (value) => renderToStaticMarkup(createElement(FigureValue, { value }));

describe('a figure out of a whole', () => {
    it('shows the whole after the slash smaller', () => {
        expect(html('418 / 1710')).toBe('418<span class="figure-of"> / 1710</span>');
        expect(html('1’234 / 2’000')).toContain('<span class="figure-of">');
    });

    it('shows the count of a share in brackets as small and quiet', () => {
        expect(html('67 % (20 / 30)')).toBe('67 %<span class="figure-of figure-count"> (20 / 30)</span>');
    });

    it('leaves anything else as it is', () => {
        for (const value of ['Straight In / Double Out', '57 %', 'T20', 42]) expect(html(value)).toBe(String(value));
    });
});
