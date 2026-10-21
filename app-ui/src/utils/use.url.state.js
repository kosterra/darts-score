import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const parse = (value, fallback) => {
    if (typeof fallback === 'number') {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }
    if (typeof fallback === 'boolean') return value === 'true';
    return value;
};

/**
 * The state of a list in the address of the page: its filters, page and sort
 * order come back with the browser's back button, a reload or a shared link.
 * defaults: { key: value } (a value that is the default stays out of the
 * address). → [state, update(changes)]; changing it adds no history entry.
 */
export const useUrlState = (defaults) => {
    const [params, setParams] = useSearchParams();
    const defaultsRef = useRef(defaults);
    defaultsRef.current = defaults;
    const key = params.toString();

    const state = useMemo(() => Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => {
        const value = params.get(name);
        return [name, value === null ? fallback : parse(value, fallback)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [key, JSON.stringify(defaults)]);

    const update = useCallback((changes) => setParams(current => {
        const next = new URLSearchParams(current);
        for (const [name, value] of Object.entries(changes)) {
            if (value === null || value === undefined || value === '' || value === defaultsRef.current[name]) next.delete(name);
            else next.set(name, String(value));
        }
        return next;
    }, { replace: true }), [setParams]);

    return [state, update];
};

export const TABLE_DEFAULTS = { page: 1, rows: 15, sort: '' };

/**
 * The paging and sorting of a DataTable from the state above: { page, rows,
 * sort } where sort is "field" or "-field" ('' for the table's own order).
 * Spread the result onto the DataTable.
 */
export const tableState = (state, update, { sortField, sortOrder = -1 } = {}) => {
    const sort = state.sort || (sortField ? `${sortOrder < 0 ? '-' : ''}${sortField}` : '');
    return {
        paginator: true,
        rows: state.rows,
        first: (Math.max(1, state.page) - 1) * state.rows,
        rowsPerPageOptions: [15, 30, 60],
        sortField: sort ? sort.replace(/^-/, '') : undefined,
        sortOrder: sort.startsWith('-') ? -1 : 1,
        onPage: (event) => update({ page: event.page + 1, rows: event.rows }),
        onSort: (event) => update({ sort: `${event.sortOrder < 0 ? '-' : ''}${event.sortField}`, page: 1 }),
    };
};

const day = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const dateOf = (value) => {
    const [year, month, dayOfMonth] = String(value || '').split('-').map(Number);
    return year && month && dayOfMonth ? new Date(year, month - 1, dayOfMonth) : null;
};

/**
 * Filters kept as one object (as the statistics have them) in the address,
 * every filter a parameter of its own: numbers come back as numbers, a date
 * range "range: [from, to]" as "from" and "to" days. → [filters, setFilters(all)]
 */
export const useUrlFilters = (defaults) => {
    const plain = Object.fromEntries(Object.entries(defaults).filter(([name]) => name !== 'range'));
    const stringDefaults = Object.fromEntries(Object.entries(plain).map(([name, value]) => [name, typeof value === 'number' || typeof value === 'boolean' ? value : String(value)]));
    const [state, update] = useUrlState({ ...stringDefaults, ...('range' in defaults && { from: '', to: '' }) });

    const filters = useMemo(() => {
        const result = Object.fromEntries(Object.keys(plain).map(name => {
            const value = state[name];
            // a number chosen from a list of numbers and words ("All") comes back as a number
            return [name, typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value];
        }));
        if ('range' in defaults) {
            const from = dateOf(state.from);
            result.range = from ? [from, dateOf(state.to)] : defaults.range;
        }
        return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    const setFilters = useCallback((next) => {
        const { range, ...rest } = next;
        update({
            ...Object.fromEntries(Object.entries(rest).map(([name, value]) => [name, value === null ? '' : value])),
            ...('range' in defaults && { from: day(range?.[0]), to: day(range?.[1]) }),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [update]);

    return [filters, setFilters];
};
