import dayjs from 'dayjs';
import { formatTrainingTime } from './training.time';
import { t } from './i18n';

// The Around the Clock scoreboard: which times are listed, in which order, and
// where a new time ended up.

export const PERIODS = [
    { label: 'Today', value: 'today' },
    { label: t('This month'), value: 'month' },
    { label: t('All time'), value: 'all' },
];

const inPeriod = (entry, period, now) => period === 'all'
    || dayjs(entry.createdAt).isSame(now, period === 'today' ? 'day' : 'month');

// deleted players are told apart by the nickname they kept
const playerKey = (entry) => entry.player?.id ?? entry.player?.nickname ?? entry.id;

// against the clock the time, with the fewest darts the darts: lower is better in both
export const scoreOf = (entry) => entry.scoring === 'Darts' ? entry.darts : entry.timeMs;

// "3 games" in the language of the app (the word in English, as the key of its texts)
const plural = (count, word) => t(count === 1 ? `{{count}} ${word}` : `{{count}} ${word}s`, { count });

// e.g. "1:23.45" or "34 darts"
export const formatScore = (entry) => entry.scoring === 'Darts' ? plural(entry.darts, 'dart') : formatTrainingTime(entry.timeMs);

// the better score first; the same score: who set it first
const faster = (a, b) => scoreOf(a) - scoreOf(b) || new Date(a.createdAt) - new Date(b.createdAt);

// which times are listed: each player's best, every attempt, or the own attempts
export const LISTS = [
    { label: t('Best per player'), value: 'best' },
    { label: t('All attempts'), value: 'all' },
    { label: 'Mine', value: 'mine' },
];

/**
 * The listed times of the period, fastest first, with their place. The same
 * score shares a place (two at 21 darts are both 1st, the next is 3rd); among
 * them who set it first is listed first.
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
    const sorted = listed.sort(faster);
    let rank = 0;
    return sorted.map((entry, index) => {
        if (index === 0 || scoreOf(entry) !== scoreOf(sorted[index - 1])) rank = index + 1;
        return { entry, rank };
    });
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
        return best ? t('Your best stays {{formatScore}} · {{ordinal}} of {{length}}', { formatScore: formatScore(best.entry), ordinal: ordinal(best.rank), length: rows.length }) : null;
    }
    const place = t('{{ordinal}} of {{length}}', { ordinal: ordinal(row.rank), length: rows.length });
    const tied = rows.some(other => other !== row && scoreOf(other.entry) === scoreOf(saved));
    if (row.rank === 1) {
        if (tied) return t('{{place}} · level with the best', { place: place });
        const next = rows.find(other => scoreOf(other.entry) > scoreOf(saved));
        return next ? t('{{place}} · {{gap}} ahead of {{ordinal}}', { place: place, gap: gap(scoreOf(next.entry) - scoreOf(saved), darts), ordinal: ordinal(next.rank) }) : place;
    }
    if (tied) return t('{{place}} · level with {{ordinal}}', { place: place, ordinal: ordinal(row.rank) });
    // the nearest better score
    const above = rows.filter(other => scoreOf(other.entry) < scoreOf(saved)).at(-1);
    return t('{{place}} · {{gap}} behind {{ordinal}}', { place: place, gap: gap(scoreOf(saved) - scoreOf(above.entry), darts), ordinal: ordinal(above.rank) });
};
