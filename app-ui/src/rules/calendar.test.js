import { describe, expect, it } from 'vitest';
import { addDays, clubNightsBetween, competitionEvents, isDayKey, nightsError, weekdayOf } from './calendar';

describe('the days of the calendar', () => {
    it('counts days across months and the change to winter time', () => {
        expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
        expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
        expect(weekdayOf('2026-10-27')).toBe(2);
    });

    it('takes only real days', () => {
        expect(isDayKey('2026-02-28')).toBe(true);
        expect(isDayKey('2026-02-30')).toBe(false);
        expect(isDayKey('26-2-1')).toBe(false);
    });
});

describe('club nights', () => {
    const nights = [{ weekday: 2, start: '19:30', end: '23:00', note: 'Back room' }, { weekday: 5, start: '20:00' }];

    it('are every week on their day, the cancelled ones with their reason', () => {
        const list = clubNightsBetween(nights, [{ day: '2026-11-03', reason: 'Room taken' }], '2026-10-27', '2026-11-07');
        expect(list.map(night => night.day)).toEqual(['2026-10-27', '2026-10-30', '2026-11-03', '2026-11-06']);
        expect(list[0]).toMatchObject({ start: '19:30', end: '23:00', note: 'Back room', cancelled: null });
        expect(list[1].end).toBeNull();
        expect(list[2].cancelled).toEqual({ reason: 'Room taken' });
    });

    it('are checked before they are kept', () => {
        expect(nightsError(nights)).toBeNull();
        expect(nightsError([{ weekday: 7, start: '19:30' }])).toMatch(/day/);
        expect(nightsError([{ weekday: 1, start: '25:00' }])).toMatch(/starts/);
        expect(nightsError([{ weekday: 1, start: '19:00' }, { weekday: 1, start: '20:00' }])).toBe('One club night a day.');
    });
});

describe('the days of tournaments and leagues', () => {
    it('come from the rounds, the end of the registration and the matchdays', () => {
        const events = competitionEvents({
            tournaments: [
                { id: 't1', name: 'Cup', status: 'registration', closesAt: '2026-11-01T18:00:00Z', rounds: [{ size: 4, date: '2026-11-10T18:30:00Z' }, { size: 8, date: null }, { size: 16, date: '2026-11-03T18:30:00Z', skipped: true }] },
                { id: 't2', name: 'Draft', status: 'draft', rounds: [{ size: 2, date: '2026-11-05T18:30:00Z' }] },
            ],
            leagues: [{ id: 'l1', name: 'Winter', status: 'running', matchdays: [{ day: 1, date: '2026-11-04T18:30:00Z' }] }, { id: 'l2', name: 'Old', status: 'finished', matchdays: [{ day: 1, date: '2026-10-07T18:30:00Z' }] }, { id: 'l3', name: 'Gone', status: 'cancelled', matchdays: [{ day: 1, date: '2026-11-04T18:30:00Z' }] }],
        });
        expect(events.map(event => event.type)).toEqual(['matchday', 'registrationEnds', 'matchday', 'tournamentRound']);
        expect(events[0]).toMatchObject({ name: 'Old', day: 1, link: '/leagues/l2' });
        expect(events[2]).toMatchObject({ name: 'Winter', day: 1, link: '/leagues/l1' });
        expect(events[3]).toMatchObject({ round: 4, link: '/tournaments/t1' });
    });

    it('plans the matchdays of a league not started yet from its first day', () => {
        const events = competitionEvents({ leagues: [{ id: 'l4', name: 'Spring', status: 'draft', firstDay: '2026-11-03T18:30:00Z', everyDays: 7, meetings: 1, players: ['a', 'b', 'c', 'd'] }] });
        expect(events.map(event => [event.day, event.at.toISOString().slice(0, 10), event.planned])).toEqual([[1, '2026-11-03', true], [2, '2026-11-10', true], [3, '2026-11-17', true]]);
    });
});

describe('the month view', () => {
    it('shows whole weeks, Monday first', async () => {
        const { monthGrid, otherMonth } = await import('./calendar');
        // November 2026 starts on a Sunday and ends on a Monday
        expect(monthGrid('2026-11')).toEqual({ from: '2026-10-26', to: '2026-12-06' });
        expect(monthGrid('2026-02')).toEqual({ from: '2026-01-26', to: '2026-03-01' });
        expect(otherMonth('2026-12', 1)).toBe('2027-01');
        expect(otherMonth('2026-01', -1)).toBe('2025-12');
    });
});
