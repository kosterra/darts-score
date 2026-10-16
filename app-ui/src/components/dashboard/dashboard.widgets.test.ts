import { describe, it, expect } from 'vitest';
import { DASHBOARD_WIDGETS, DEFAULT_WIDGET_IDS, resolveWidgets } from './dashboard.widgets';

describe('resolveWidgets', () => {
    it('gives a club without a choice the default set', () => {
        expect(resolveWidgets(undefined).map(w => w.id)).toEqual(DEFAULT_WIDGET_IDS);
        expect(resolveWidgets([]).map(w => w.id)).toEqual(DEFAULT_WIDGET_IDS);
    });
    it('keeps the order the club chose', () => {
        expect(resolveWidgets(['timeline', 'totals']).map(w => w.id)).toEqual(['timeline', 'totals']);
    });
    it('ignores widgets that no longer exist', () => {
        expect(resolveWidgets(['timeline', 'retiredWidget']).map(w => w.id)).toEqual(['timeline']);
    });
});

describe('DASHBOARD_WIDGETS', () => {
    it('has unique ids the API accepts', () => {
        const ids = DASHBOARD_WIDGETS.map(w => w.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach(id => expect(id).toMatch(/^[A-Za-z0-9]{1,40}$/));
    });
    it('only uses default widgets that exist', () => {
        DEFAULT_WIDGET_IDS.forEach(id => expect(DASHBOARD_WIDGETS.some(w => w.id === id)).toBe(true));
    });
});
