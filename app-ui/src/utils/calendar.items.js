import { dayKeyIn, timeIn } from '../rules/zones';

/**
 * What the calendar shows, in the order of the days: the club nights (a day
 * and times already on the club's clock) and the tournament and league days
 * (moments, put on the club's clock too: the day they fall on there and
 * their time, whatever the time zone of the phone).
 * Each item: { key, day, sort, night } or { key, day, sort, time, event }.
 */
export const calendarItems = (calendar, zone) => [
    ...(calendar?.clubNights ?? []).map(night => ({ key: `night-${night.day}`, day: night.day, sort: night.start, night })),
    ...(calendar?.events ?? []).map(event => {
        const time = timeIn(event.at, zone);
        return { key: event.id, day: dayKeyIn(event.at, zone), sort: time, time, event };
    }),
].sort((a, b) => a.day.localeCompare(b.day) || a.sort.localeCompare(b.sort));
