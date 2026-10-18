import dayjs from 'dayjs';
import { formatTrainingTime } from './training.time';

// The Around the Clock scoreboard: which times are listed, in which order, and
// where a new time ended up.

export const PERIODS = [
    { label: 'Today', value: 'today' },
    { label: 'This month', value: 'month' },
    { label: 'All time', value: 'all' },
];

const inPeriod = (entry, period, now) => period === 'all'
    || dayjs(entry.createdAt).isSame(now, period === 'today' ? 'day' : 'month');

// deleted players are told apart by the nickname they kept
const playerKey = (entry) => entry.player?.id ?? entry.player?.nickname ?? entry.id;

// the faster time first; the same time: who set it first
const faster = (a, b) => a.timeMs - b.timeMs || new Date(a.createdAt) - new Date(b.createdAt);

/**
 * The listed times of the period, fastest first, with their place.
 * bestOnly: each player's best time only
 */
export const scoreboardRows = (entries, { period = 'all', bestOnly = true, now = new Date() } = {}) => {
    let listed = entries.filter(entry => entry.timeMs && inPeriod(entry, period, now));
    if (bestOnly) {
        const best = new Map();
        for (const entry of listed) {
            const key = playerKey(entry);
            if (!best.has(key) || faster(entry, best.get(key)) < 0) best.set(key, entry);
        }
        listed = [...best.values()];
    }
    return listed.sort(faster).map((entry, index) => ({ entry, rank: index + 1 }));
};

// 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st
export const ordinal = (n) => {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

const gap = (hundredths) => hundredths >= 6000 ? formatTrainingTime(hundredths) : `${(hundredths / 100).toFixed(2)} s`;

/**
 * One line on where a new time ended up on the scoreboard as it is shown,
 * e.g. "3rd of 12 · 0.42 s behind 2nd".
 */
export const resultLine = (rows, saved) => {
    const row = rows.find(({ entry }) => entry.id === saved.id);
    if (!row) {
        // listed by best times, and this was not the player's best
        const best = rows.find(({ entry }) => playerKey(entry) === playerKey(saved));
        return best ? `Your best stays ${formatTrainingTime(best.entry.timeMs)} · ${ordinal(best.rank)} of ${rows.length}` : null;
    }
    const place = `${ordinal(row.rank)} of ${rows.length}`;
    if (row.rank === 1) {
        const second = rows[1];
        return second ? `${place} · ${gap(second.entry.timeMs - saved.timeMs)} ahead of 2nd` : place;
    }
    const above = rows[row.rank - 2];
    return `${place} · ${gap(saved.timeMs - above.entry.timeMs)} behind ${ordinal(above.rank)}`;
};
