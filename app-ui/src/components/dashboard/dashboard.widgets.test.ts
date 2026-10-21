import { describe, it, expect } from 'vitest';
import { DASHBOARD_WIDGETS, DEFAULT_LAYOUT, DEFAULT_WIDGET_IDS, WIDGET_SIZES, layoutFor, resolveLayout, toLayout } from './dashboard.widgets';

describe('resolveLayout', () => {
    it('gives a dashboard without a choice of its own the default set', () => {
        expect(resolveLayout(undefined).map(w => w.id)).toEqual(DEFAULT_WIDGET_IDS);
        expect(resolveLayout([]).map(w => w.id)).toEqual(DEFAULT_WIDGET_IDS);
    });
    it('keeps the order and the widths chosen, with their columns', () => {
        const widgets = resolveLayout([{ id: 'timeline', size: 'F' }, { id: 'totals', size: 'S' }]);
        expect(widgets.map(w => [w.id, w.size, w.cols])).toEqual([['timeline', 'F', 'col-12'], ['totals', 'S', 'col-12 col-md-6 col-xl-4']]);
    });
    it('reads the plain widget ids stored before, each with its own width', () => {
        expect(resolveLayout(['timeline', 'totals']).map(w => [w.id, w.size])).toEqual([['timeline', 'L'], ['totals', 'F']]);
    });
    it('ignores widgets that no longer exist and unknown widths, and the Hall of Shame of clubs without it', () => {
        expect(resolveLayout([{ id: 'retired', size: 'S' }, { id: 'records', size: 'XXL' }]).map(w => [w.id, w.size])).toEqual([['records', 'M']]);
        expect(resolveLayout([{ id: 'hallOfShame', size: 'M' }, { id: 'me', size: 'S' }], { shameBadges: false }).map(w => w.id)).toEqual(['me']);
    });
});

describe('layoutFor', () => {
    const club = { id: 'c1', dashboardLayout: [{ id: 'records', size: 'M' }] };
    it("shows a user's own arrangement in the club, else the club's", () => {
        expect(layoutFor({ dashboards: [{ club: 'c1', layout: [{ id: 'me', size: 'F' }] }] }, club)).toEqual({ layout: [{ id: 'me', size: 'F' }], own: true });
        expect(layoutFor({ dashboards: [{ club: 'c2', layout: [{ id: 'me', size: 'F' }] }] }, club)).toEqual({ layout: club.dashboardLayout, own: false });
        expect(layoutFor(null, { id: 'c1', dashboardWidgets: ['me'] }).layout).toEqual(['me']);
    });
    it('falls back to the default set', () => {
        expect(toLayout(layoutFor(null, { id: 'c1' }).layout)).toEqual(DEFAULT_LAYOUT);
    });
});

describe('DASHBOARD_WIDGETS', () => {
    it('has unique ids the API accepts, each with a width', () => {
        const ids = DASHBOARD_WIDGETS.map(w => w.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach(id => expect(id).toMatch(/^[A-Za-z0-9]{1,40}$/));
        DASHBOARD_WIDGETS.forEach(w => expect(WIDGET_SIZES.map(size => size.value)).toContain(w.size));
    });
    it('only uses default widgets that exist', () => {
        DEFAULT_WIDGET_IDS.forEach(id => expect(DASHBOARD_WIDGETS.some(w => w.id === id)).toBe(true));
    });
});
