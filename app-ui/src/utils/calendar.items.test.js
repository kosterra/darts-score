import { describe, expect, it } from 'vitest';
import { calendarItems } from './calendar.items';

describe('calendarItems', () => {
    const calendar = {
        clubNights: [{ day: '2026-11-10', start: '19:30', end: '23:00' }],
        events: [
            // 23:30 UTC on the 9th is half past midnight on the 10th in Zurich
            { id: 'r1', type: 'tournamentRound', at: '2026-11-09T23:30:00Z' },
            { id: 'm1', type: 'matchday', at: '2026-11-10T17:00:00Z' },
        ],
    };

    it('puts tournament and league days on the club\'s clock, whatever the zone of the device', () => {
        const items = calendarItems(calendar, 'Europe/Zurich');
        expect(items.map(item => [item.key, item.day, item.sort])).toEqual([
            ['r1', '2026-11-10', '00:30'],
            ['m1', '2026-11-10', '18:00'],
            ['night-2026-11-10', '2026-11-10', '19:30'],
        ]);
        expect(items[1].time).toBe('18:00');
    });

    it('follows the club\'s zone', () => {
        const items = calendarItems(calendar, 'America/New_York');
        expect(items.find(item => item.key === 'r1')).toMatchObject({ day: '2026-11-09', time: '18:30' });
        expect(items.find(item => item.key === 'm1')).toMatchObject({ day: '2026-11-10', time: '12:00' });
    });

    it('a summer time is kept', () => {
        const items = calendarItems({ events: [{ id: 'x', at: '2026-07-01T17:00:00Z' }] }, 'Europe/Zurich');
        expect(items[0]).toMatchObject({ day: '2026-07-01', time: '19:00' });
    });

    it('nothing loaded, nothing shown', () => {
        expect(calendarItems(null, 'Europe/Zurich')).toEqual([]);
    });
});
