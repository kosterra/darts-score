import dayjs from 'dayjs';
import { formatDate } from './dates';

// up to this many games every game is a point of its own
export const MAX_SINGLE_GAMES = 30;
// over this many months the points are quarters
const MAX_MONTHS = 36;

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * Games over time, readable however many there are: up to 30 games each one
 * stays a point; more are grouped by month, and over three years by quarter.
 * Every value of "keys" is averaged over the games in a group, or added up
 * with { combine: 'sum' } (e.g. legs won).
 *
 * rows: [{ date, [key]: value }] oldest first
 * Resolves to { rows: [{ label, games, [key]: value }], step: 'game' | 'month' | 'quarter' }
 */
export const groupByPeriod = (rows, keys, { combine = 'average' } = {}) => {
    if (rows.length <= MAX_SINGLE_GAMES) {
        return { step: 'game', rows: rows.map(row => ({ ...row, label: formatDate(row.date, { year: 'short' }), games: 1 })) };
    }
    const first = dayjs(rows[0].date);
    const last = dayjs(rows[rows.length - 1].date);
    const step = last.diff(first, 'month') > MAX_MONTHS ? 'quarter' : 'month';
    const periodOf = (date) => {
        const day = dayjs(date);
        return step === 'month'
            ? { key: day.format('YYYY-MM'), label: day.format('MMM YY') }
            : { key: `${day.year()}-Q${Math.floor(day.month() / 3) + 1}`, label: `Q${Math.floor(day.month() / 3) + 1} ${day.format('YY')}` };
    };

    const groups = new Map();
    rows.forEach(row => {
        const { key, label } = periodOf(row.date);
        const group = groups.get(key) ?? { label, games: 0, values: Object.fromEntries(keys.map(k => [k, []])) };
        group.games += 1;
        keys.forEach(k => { if (row[k] != null) group.values[k].push(Number(row[k])); });
        groups.set(key, group);
    });

    return {
        step,
        rows: [...groups.values()].map(({ label, games, values }) => ({
            label,
            games,
            ...Object.fromEntries(keys.map(k => {
                if (!values[k].length) return [k, null];
                const total = values[k].reduce((a, b) => a + b, 0);
                return [k, combine === 'sum' ? total : round1(total / values[k].length)];
            })),
        })),
    };
};
