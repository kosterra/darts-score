/**
 * Days, weeks and years in a time zone: a club plays in its own (its
 * timeZone, Europe/Zurich unless it chose another), whatever the time zone
 * of the server or the phone. Built on Intl, so a change of the clocks is
 * kept: a club night at 19:30 stays at 19:30 in winter and summer. Plain
 * data and functions without texts: the API keeps an identical copy (see
 * shared.js).
 */

export const DEFAULT_TIME_ZONE = 'Europe/Zurich';

const pad = (value) => String(value).padStart(2, '0');
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// a zone the runtime knows ("Europe/Zurich", "Europe/London", "UTC")
export const isTimeZone = (zone) => {
    if (typeof zone !== 'string' || !zone || zone.length > 64) return false;
    try {
        new Intl.DateTimeFormat('en', { timeZone: zone });
        return true;
    } catch {
        return false;
    }
};

// the zone of a club, or the default
export const zoneOf = (club) => (isTimeZone(club?.timeZone) ? club.timeZone : DEFAULT_TIME_ZONE);

const formatters = new Map();
const formatterOf = (zone) => {
    if (!formatters.has(zone)) {
        formatters.set(zone, new Intl.DateTimeFormat('en-GB', {
            timeZone: zone, hourCycle: 'h23', weekday: 'short',
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
        }));
    }
    return formatters.get(zone);
};

// the wall clock of a moment in a zone: { year, month (1 to 12), day, hour, minute, second, weekday (0 Sunday) }
export const partsIn = (date, zone = DEFAULT_TIME_ZONE) => {
    const parts = Object.fromEntries(formatterOf(zone).formatToParts(new Date(date)).map(part => [part.type, part.value]));
    return {
        year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
        hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
        weekday: WEEKDAYS[parts.weekday],
    };
};

// the day of a moment in a zone: "2026-11-03"
export const dayKeyIn = (date, zone = DEFAULT_TIME_ZONE) => {
    const { year, month, day } = partsIn(date, zone);
    return `${year}-${pad(month)}-${pad(day)}`;
};

// a day moved by some days: "2026-03-28" + 2 → "2026-03-30" (counted at noon UTC, without zones)
const shiftDay = (key, days) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
};

// how far a zone's clock is ahead of UTC at a moment, in milliseconds
const offsetAt = (at, zone) => {
    const p = partsIn(at, zone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000;
};

/**
 * The moment of a day and a time on the clock of a zone ("2026-10-27",
 * "19:30", "Europe/Zurich" → 18:30 UTC). A time skipped when the clocks go
 * forward comes out an hour later, as a clock would show it.
 */
export const instantIn = (key, time = '00:00', zone = DEFAULT_TIME_ZONE) => {
    const [year, month, day] = key.split('-').map(Number);
    const [hours, minutes] = String(time).split(':').map(Number);
    const wall = Date.UTC(year, month - 1, day, hours || 0, minutes || 0);
    const first = new Date(wall - offsetAt(new Date(wall), zone));
    return new Date(wall - offsetAt(first, zone));
};

// the time of a moment on the clock of a zone: "19:30"
export const timeIn = (date, zone = DEFAULT_TIME_ZONE) => {
    const { hour, minute } = partsIn(date, zone);
    return `${pad(hour)}:${pad(minute)}`;
};

/**
 * The week of a moment in a zone, Monday to Sunday: from the Monday at
 * midnight to the next Monday at midnight (not included), and its key, the
 * Monday's day.
 */
export const weekRangeIn = (date, zone = DEFAULT_TIME_ZONE) => {
    const key = dayKeyIn(date, zone);
    const monday = shiftDay(key, -((partsIn(date, zone).weekday + 6) % 7));
    return { from: instantIn(monday, '00:00', zone), until: instantIn(shiftDay(monday, 7), '00:00', zone), key: monday };
};

// a moment as its zone's clock reads it, counted as if that were UTC (for counting days and
// weeks: midnight on the clock is a whole day in these milliseconds)
export const wallClock = (date, zone = DEFAULT_TIME_ZONE) => {
    const p = partsIn(date, zone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
};

// a year in a zone: from New Year's midnight to the next (not included)
export const yearSpanIn = (year, zone = DEFAULT_TIME_ZONE) => ({ from: instantIn(`${year}-01-01`, '00:00', zone), to: instantIn(`${year + 1}-01-01`, '00:00', zone) });

// the year of a moment in a zone
export const yearIn = (date, zone = DEFAULT_TIME_ZONE) => partsIn(date, zone).year;
