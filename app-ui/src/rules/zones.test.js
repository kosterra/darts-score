import { describe, expect, it } from 'vitest';
import { DEFAULT_TIME_ZONE, dayKeyIn, instantIn, isTimeZone, timeIn, weekRangeIn, yearIn, yearSpanIn, zoneOf } from './zones';

describe('days and weeks in a time zone', () => {
    it('knows the zones, with Europe/Zurich as the default', () => {
        expect(isTimeZone('Europe/London')).toBe(true);
        expect(isTimeZone('Mars/Olympus')).toBe(false);
        expect(isTimeZone('')).toBe(false);
        expect(zoneOf({ timeZone: 'Europe/London' })).toBe('Europe/London');
        expect(zoneOf({ timeZone: 'nonsense' })).toBe(DEFAULT_TIME_ZONE);
        expect(zoneOf(null)).toBe(DEFAULT_TIME_ZONE);
    });

    it('keeps a club night at 19:30 on the clock across the change of the clocks', () => {
        expect(instantIn('2026-10-20', '19:30', 'Europe/Zurich').toISOString()).toBe('2026-10-20T17:30:00.000Z');
        expect(instantIn('2026-10-27', '19:30', 'Europe/Zurich').toISOString()).toBe('2026-10-27T18:30:00.000Z');
        expect(instantIn('2026-10-27', '19:30', 'Europe/London').toISOString()).toBe('2026-10-27T19:30:00.000Z');
        expect(timeIn(new Date('2026-10-27T18:30:00Z'), 'Europe/Zurich')).toBe('19:30');
        // a time the clocks skip comes out as the clock shows it
        expect(timeIn(instantIn('2026-03-29', '02:30', 'Europe/Zurich'), 'Europe/Zurich')).toBe('03:30');
    });

    it('cuts days, weeks and years at midnight in the zone, not in UTC', () => {
        // Monday 00:30 in Zurich is still Sunday in UTC
        const mondayNight = new Date('2026-11-01T23:30:00Z');
        expect(dayKeyIn(mondayNight, 'Europe/Zurich')).toBe('2026-11-02');
        expect(dayKeyIn(mondayNight, 'UTC')).toBe('2026-11-01');
        const week = weekRangeIn(mondayNight, 'Europe/Zurich');
        expect(week.key).toBe('2026-11-02');
        expect(week.from.toISOString()).toBe('2026-11-01T23:00:00.000Z');
        expect(week.until.toISOString()).toBe('2026-11-08T23:00:00.000Z');
        // the week the clocks went back in (Sunday 25 October) starts at midnight in summer time, ends in winter time
        const changing = weekRangeIn(new Date('2026-10-21T12:00:00Z'), 'Europe/Zurich');
        expect([changing.from.toISOString(), changing.until.toISOString()]).toEqual(['2026-10-18T22:00:00.000Z', '2026-10-25T23:00:00.000Z']);
        expect(yearIn(new Date('2026-12-31T23:30:00Z'), 'Europe/Zurich')).toBe(2027);
        expect(yearSpanIn(2027, 'Europe/Zurich').from.toISOString()).toBe('2026-12-31T23:00:00.000Z');
    });

    it('keeps a skipped time an hour later and a skipped midnight on its day, west of UTC too', () => {
        // New York skips 02:00 to 03:00 on 8 March 2026: 02:30 is 03:30 summer time
        expect(instantIn('2026-03-08', '02:30', 'America/New_York').toISOString()).toBe('2026-03-08T07:30:00.000Z');
        expect(timeIn(instantIn('2026-03-08', '02:30', 'America/New_York'), 'America/New_York')).toBe('03:30');
        // Santiago skips midnight on 6 September 2026: the day starts at 01:00 on the 6th, not on the 5th
        const santiago = instantIn('2026-09-06', '00:00', 'America/Santiago');
        expect(santiago.toISOString()).toBe('2026-09-06T04:00:00.000Z');
        expect(dayKeyIn(santiago, 'America/Santiago')).toBe('2026-09-06');
        // the same in Zurich
        expect(instantIn('2026-03-29', '02:30', 'Europe/Zurich').toISOString()).toBe('2026-03-29T01:30:00.000Z');
        // the days around a change keep their usual times
        expect(instantIn('2026-03-07', '23:00', 'America/New_York').toISOString()).toBe('2026-03-08T04:00:00.000Z');
        expect(instantIn('2026-03-08', '23:00', 'America/New_York').toISOString()).toBe('2026-03-09T03:00:00.000Z');
        expect(instantIn('2026-03-28', '19:30', 'Europe/Zurich').toISOString()).toBe('2026-03-28T18:30:00.000Z');
        expect(instantIn('2026-03-29', '19:30', 'Europe/Zurich').toISOString()).toBe('2026-03-29T17:30:00.000Z');
    });

    it('takes the first of a time the clocks show twice, in both hemispheres', () => {
        // Zurich goes back from 03:00 to 02:00 on 25 October 2026: 02:30 summer time comes first
        expect(instantIn('2026-10-25', '02:30', 'Europe/Zurich').toISOString()).toBe('2026-10-25T00:30:00.000Z');
        // New York goes back from 02:00 to 01:00 on 1 November 2026
        expect(instantIn('2026-11-01', '01:30', 'America/New_York').toISOString()).toBe('2026-11-01T05:30:00.000Z');
        // Sydney goes back from 03:00 to 02:00 on 5 April 2026 (+11 to +10)
        expect(instantIn('2026-04-05', '02:30', 'Australia/Sydney').toISOString()).toBe('2026-04-04T15:30:00.000Z');
        // Santiago goes back from 00:00 to 23:00 on 4 April 2026 (-3 to -4)
        expect(instantIn('2026-04-04', '23:30', 'America/Santiago').toISOString()).toBe('2026-04-05T02:30:00.000Z');
    });
});
