import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { activityCalendar, gamesPerMonth, clubFormPerMonth, whenWePlay } from './club.charts';

// local times, like the browser sees them
const at = (text) => dayjs(text).toISOString();

describe('activityCalendar', () => {
    it('counts games per day in weeks starting on Monday, without days after today', () => {
        const today = dayjs('2026-10-14'); // a Wednesday
        const calendar = activityCalendar([{ at: at('2026-10-12T20:00') }, { at: at('2026-10-12T21:00') }, { at: at('2026-10-01T19:00') }], today, 3);
        expect(calendar.columns).toHaveLength(3);
        expect(calendar.columns[0].start).toBe('2026-09-28');
        const lastWeek = calendar.columns[2].days;
        expect(lastWeek[0]).toEqual({ date: '2026-10-12', count: 2 });
        expect(lastWeek[3]).toBeNull();
        expect(calendar.total).toBe(3);
        expect(calendar.max).toBe(2);
    });
});

describe('gamesPerMonth', () => {
    it('counts finished games per month and type', () => {
        const months = gamesPerMonth([
            { at: at('2026-10-02T19:00'), type: 'x01', finished: true },
            { at: at('2026-10-03T19:00'), type: 'cricket', finished: true },
            { at: at('2026-10-04T19:00'), type: 'x01', finished: false },
            { at: at('2026-09-04T19:00'), type: 'elimination', finished: true },
        ], dayjs('2026-10-16'), 2);
        expect(months.map(({ month, x01, cricket, elimination }) => [month, x01, cricket, elimination])).toEqual([
            ['2026-09', 0, 0, 1],
            ['2026-10', 1, 1, 0],
        ]);
    });
});

describe('clubFormPerMonth', () => {
    it('weights the average by rounds and leaves empty months empty', () => {
        const form = clubFormPerMonth([
            { at: at('2026-10-02T19:00'), type: 'x01', finished: true, points: 600, rounds: 10 },
            { at: at('2026-10-05T19:00'), type: 'x01', finished: true, points: 300, rounds: 10 },
        ], dayjs('2026-10-16'), 2);
        expect(form.map(entry => entry.average)).toEqual([null, 45]);
    });
});

describe('whenWePlay', () => {
    it('sorts games by weekday and time of day, early hours into the night before', () => {
        const { grid, max } = whenWePlay([
            { at: at('2026-10-12T10:00') }, // Monday morning
            { at: at('2026-10-12T19:30') }, // Monday evening
            { at: at('2026-10-13T01:30') }, // Tuesday 1:30 → Monday night
            { at: at('2026-10-18T14:00') }, // Sunday afternoon
        ]);
        expect(grid[0]).toEqual([1, 0, 1, 1]);
        expect(grid[6]).toEqual([0, 1, 0, 0]);
        expect(max).toBe(1);
    });
});
