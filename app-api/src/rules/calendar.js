/**
 * The calendar of a club: its weekly club nights (with the nights that are
 * cancelled), and the days of its tournaments and leagues. A day is kept as
 * "YYYY-MM-DD" and a time as "HH:MM", in the club's own time, so a club night
 * stays at 19:30 whatever the time zone of the server or the phone. Plain
 * data and functions without texts: the API keeps an identical copy (see
 * shared.js).
 */

export const MAX_CLUB_NIGHTS = 7;
export const NOTE_MAX = 80;
export const REASON_MAX = 120;
export const ATTENDANCE_ANSWERS = ['yes', 'no'];
// how far ahead the calendar and the feed reach
export const WEEKS_AHEAD = 26;
const DAY = 24 * 60 * 60 * 1000;

export const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (value) => String(value).padStart(2, '0');

// the day of a date in the local time of whoever asks: "2026-11-03"
export const dayKey = (date) => {
    const at = new Date(date);
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
};

// a day as a date at noon UTC, to count days without time zones
const noonOf = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
};
const keyOfNoon = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

// a real day: "2026-02-30" is not
export const isDayKey = (key) => typeof key === 'string' && DAY_KEY.test(key) && keyOfNoon(noonOf(key)) === key;

export const addDays = (key, days) => keyOfNoon(new Date(noonOf(key).getTime() + days * DAY));

// the days the grid of a month shows: from the Monday of its first week to the Sunday of its last
export const monthGrid = (month) => {
    const first = `${month}-01`;
    const from = addDays(first, -((noonOf(first).getUTCDay() + 6) % 7));
    const [year, number] = month.split('-').map(Number);
    const last = new Date(Date.UTC(year, number, 0, 12)).toISOString().slice(0, 10);
    const to = addDays(last, (7 - noonOf(last).getUTCDay()) % 7);
    return { from, to };
};

// the month before or after: "2026-11" → "2026-12"
export const otherMonth = (month, by) => {
    const [year, number] = month.split('-').map(Number);
    const at = new Date(Date.UTC(year, number - 1 + by, 1, 12));
    return at.toISOString().slice(0, 7);
};

// 0 Sunday … 6 Saturday, as Date.getDay()
export const weekdayOf = (key) => noonOf(key).getUTCDay();

/**
 * Why the weekly club nights cannot be kept like this, or null.
 * nights: [{ weekday, start, end, note }]
 */
export const nightsError = (nights) => {
    if (!Array.isArray(nights)) return 'Choose the club nights.';
    if (nights.length > MAX_CLUB_NIGHTS) return `A club has at most ${MAX_CLUB_NIGHTS} club nights a week.`;
    for (const night of nights) {
        if (!Number.isInteger(night.weekday) || night.weekday < 0 || night.weekday > 6) return 'Choose the day of every club night.';
        if (!TIME.test(night.start ?? '')) return 'Choose when every club night starts.';
        if (night.end && !TIME.test(night.end)) return 'The end of a club night is a time like 23:00.';
        if (String(night.note ?? '').length > NOTE_MAX) return `A note is at most ${NOTE_MAX} characters.`;
    }
    if (new Set(nights.map(night => night.weekday)).size !== nights.length) return 'One club night a day.';
    return null;
};

/**
 * The club nights from one day to another (both included), the cancelled
 * ones with their reason: [{ day, weekday, start, end, note, cancelled }]
 */
export const clubNightsBetween = (nights = [], cancelled = [], from, to) => {
    const reasons = new Map(cancelled.map(entry => [entry.day, entry.reason ?? '']));
    const list = [];
    for (let key = from; key <= to; key = addDays(key, 1)) {
        const night = nights.find(entry => entry.weekday === weekdayOf(key));
        if (!night) continue;
        list.push({ day: key, weekday: night.weekday, start: night.start, end: night.end || null, note: night.note || '', cancelled: reasons.has(key) ? { reason: reasons.get(key) } : null });
    }
    return list;
};

// a club night is on that day (cancelled or not)
export const isClubNight = (nights = [], key) => nights.some(night => night.weekday === weekdayOf(key));

/**
 * The days of a club's tournaments and leagues, as events:
 * [{ id, type, at, name, link, round | day }]; the texts are made where they are shown.
 * Only tournaments and leagues others can see (no drafts, nothing cancelled).
 */
export const competitionEvents = ({ tournaments = [], leagues = [] }) => {
    const events = [];
    for (const tournament of tournaments) {
        if (['draft', 'cancelled'].includes(tournament.status)) continue;
        if (tournament.status === 'registration' && tournament.closesAt) {
            events.push({ id: `t-${tournament.id}-closes`, type: 'registrationEnds', at: new Date(tournament.closesAt), name: tournament.name, link: `/tournaments/${tournament.id}` });
        }
        for (const round of tournament.rounds ?? []) {
            if (!round.date || round.skipped) continue;
            events.push({ id: `t-${tournament.id}-${round.size}`, type: 'tournamentRound', at: new Date(round.date), name: tournament.name, round: round.size, link: `/tournaments/${tournament.id}` });
        }
    }
    for (const league of leagues) {
        if (league.status !== 'running') continue;
        for (const matchday of league.matchdays ?? []) {
            events.push({ id: `l-${league.id}-${matchday.day}`, type: 'matchday', at: new Date(matchday.date), name: league.name, day: matchday.day, link: `/leagues/${league.id}` });
        }
    }
    return events.sort((a, b) => a.at - b.at);
};
