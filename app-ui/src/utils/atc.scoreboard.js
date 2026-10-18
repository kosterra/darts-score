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

// against the clock the time, with the fewest darts the darts: lower is better in both
export const scoreOf = (entry) => entry.scoring === 'Darts' ? entry.darts : entry.timeMs;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// e.g. "1:23.45" or "34 darts"
export const formatScore = (entry) => entry.scoring === 'Darts' ? plural(entry.darts, 'dart') : formatTrainingTime(entry.timeMs);

// the better score first; the same score: who set it first
const faster = (a, b) => scoreOf(a) - scoreOf(b) || new Date(a.createdAt) - new Date(b.createdAt);

// which times are listed: each player's best, every attempt, or the own attempts
export const LISTS = [
    { label: 'Best per player', value: 'best' },
    { label: 'All attempts', value: 'all' },
    { label: 'Mine', value: 'mine' },
];

/**
 * The listed times of the period, fastest first, with their place.
 * list: 'best' (each player's best), 'all' or 'mine' (every attempt of myPlayerId)
 */
export const scoreboardRows = (entries, { period = 'all', list = 'best', myPlayerId = null, now = new Date() } = {}) => {
    let listed = entries.filter(entry => scoreOf(entry) && inPeriod(entry, period, now));
    if (list === 'mine') listed = listed.filter(entry => myPlayerId && entry.player?.id === myPlayerId);
    if (list === 'best') {
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

const gap = (difference, darts) => {
    if (darts) return plural(difference, 'dart');
    return difference >= 6000 ? formatTrainingTime(difference) : `${(difference / 100).toFixed(2)} s`;
};

/**
 * One line on where a new time ended up on the scoreboard as it is shown,
 * e.g. "3rd of 12 · 0.42 s behind 2nd" or "1st of 5 · 3 darts ahead of 2nd".
 */
export const resultLine = (rows, saved) => {
    const darts = saved.scoring === 'Darts';
    const row = rows.find(({ entry }) => entry.id === saved.id);
    if (!row) {
        // listed by best times, and this was not the player's best
        const best = rows.find(({ entry }) => playerKey(entry) === playerKey(saved));
        return best ? `Your best stays ${formatScore(best.entry)} · ${ordinal(best.rank)} of ${rows.length}` : null;
    }
    const place = `${ordinal(row.rank)} of ${rows.length}`;
    if (row.rank === 1) {
        const second = rows[1];
        return second ? `${place} · ${gap(scoreOf(second.entry) - scoreOf(saved), darts)} ahead of 2nd` : place;
    }
    const above = rows[row.rank - 2];
    return `${place} · ${gap(scoreOf(saved) - scoreOf(above.entry), darts)} behind ${ordinal(above.rank)}`;
};
