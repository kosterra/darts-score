import { describe, expect, it } from 'vitest';
import { CLUB_WIDGETS, DASHBOARD_WIDGETS, DEFAULT_LAYOUT, PERSONAL_DEFAULT_LAYOUT, resolveLayout, scopeOf } from './dashboard.widgets';
import { normalizeGamePreferences } from '../../rules/club.rules';

describe('the dashboards', () => {
    it('keep the personal widgets to one\'s own Dashboard', () => {
        const personal = DASHBOARD_WIDGETS.filter(widget => widget.personal).map(widget => widget.id);
        expect(personal).toEqual(['upNext', 'favourites', 'training']);
        expect(CLUB_WIDGETS.some(widget => widget.personal)).toBe(false);
        expect(DEFAULT_LAYOUT.some(item => personal.includes(item.id))).toBe(false);
    });

    it('say whether a widget shows only yours or the whole club', () => {
        expect(DASHBOARD_WIDGETS.filter(widget => scopeOf(widget) === 'you').map(widget => widget.id)).toEqual(['upNext', 'favourites', 'training', 'me']);
        expect(scopeOf({ id: 'records' })).toBe('club');
    });

    it('show their own default until arranged', () => {
        expect(resolveLayout(null).map(widget => widget.id)).toEqual(DEFAULT_LAYOUT.map(item => item.id));
        expect(resolveLayout(null, { fallback: PERSONAL_DEFAULT_LAYOUT }).map(widget => widget.id)).toEqual(['upNext', 'favourites', 'me', 'clubGoals', 'timeline']);
        expect(resolveLayout([{ id: 'favourites', size: 'F' }, { id: 'gone', size: 'S' }]).map(widget => [widget.id, widget.size])).toEqual([['favourites', 'F']]);
    });

    it('keep one\'s own arrangement with the account, only what is valid', () => {
        expect(normalizeGamePreferences({}).dashboard).toBeNull();
        expect(normalizeGamePreferences({ dashboard: [{ id: 'upNext', size: 'F' }, { id: 'me', size: 'XL' }, { id: '<b>', size: 'S' }, 'x'] }).dashboard).toEqual([{ id: 'upNext', size: 'F' }]);
    });
});
