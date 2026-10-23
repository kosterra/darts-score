import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { tableState, useUrlFilters, useUrlState } from './use.url.state';

// the tests compile JSX the classic way, which needs React at hand
globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// renders a hook inside a router at "url": → the latest { state, update, search }
const renderAt = (url, defaults) => {
    const latest = {};
    const Probe = () => {
        const [state, update] = useUrlState(defaults);
        Object.assign(latest, { state, update, search: useLocation().search });
        return null;
    };
    act(() => createRoot(document.createElement('div')).render(<MemoryRouter initialEntries={[url]}><Probe /></MemoryRouter>));
    return latest;
};

describe('state of a list in the address', () => {
    it('reads the filters from the address, with the defaults for the others', () => {
        expect(renderAt('/games?type=x01&page=3&mine=true', { type: 'all', page: 1, mine: false, status: 'all' }).state)
            .toEqual({ type: 'x01', page: 3, mine: true, status: 'all' });
    });

    it('writes changes into the address and leaves the defaults out', () => {
        const probe = renderAt('/games?type=x01&page=2', { type: 'all', status: 'all', page: 1 });
        act(() => probe.update({ status: 'finished', page: 1 }));
        expect(probe.search).toBe('?type=x01&status=finished');
        act(() => probe.update({ type: 'all' }));
        expect(probe.search).toBe('?status=finished');
    });

    it('pages and sorts a table from it', () => {
        expect(tableState({ page: 3, rows: 30, sort: '' }, () => {}, { sortField: 'createdAt', sortOrder: -1 }))
            .toMatchObject({ first: 60, rows: 30, sortField: 'createdAt', sortOrder: -1 });
        expect(tableState({ page: 1, rows: 15, sort: 'nickname' }, () => {})).toMatchObject({ first: 0, sortField: 'nickname', sortOrder: 1 });
    });
});

describe('filters of the statistics in the address', () => {
    const renderFilters = (url, defaults) => {
        const latest = {};
        const Probe = () => {
            const [filters, setFilters] = useUrlFilters(defaults);
            Object.assign(latest, { filters, setFilters, search: useLocation().search });
            return null;
        };
        act(() => createRoot(document.createElement('div')).render(<MemoryRouter initialEntries={[url]}><Probe /></MemoryRouter>));
        return latest;
    };
    const DEFAULTS = { scope: 'club', period: 'All', range: null, lastGames: 'All', startingScore: 'All', includeOthers: false };

    it('reads numbers, words, switches and a date range back', () => {
        expect(renderFilters('/p?lastGames=10&startingScore=501&scope=all&includeOthers=true&period=Custom&from=2026-10-01&to=2026-10-15', DEFAULTS).filters)
            .toEqual({ scope: 'all', period: 'Custom', range: [new Date(2026, 9, 1), new Date(2026, 9, 15)], lastGames: 10, startingScore: 501, includeOthers: true });
    });

    it('writes only what differs from the defaults', () => {
        const probe = renderFilters('/p', DEFAULTS);
        act(() => probe.setFilters({ ...DEFAULTS, lastGames: 20, period: 'Custom', range: [new Date(2026, 9, 3), null] }));
        expect(probe.search).toBe('?period=Custom&lastGames=20&from=2026-10-03');
        expect(probe.filters.range).toEqual([new Date(2026, 9, 3), null]);
        act(() => probe.setFilters(DEFAULTS));
        expect(probe.search).toBe('');
    });
});
