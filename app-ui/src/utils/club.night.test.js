import { describe, expect, it } from 'vitest';
import { eveningWindow } from './club.night';

describe('the window of a club evening', () => {
    it('runs from three hours before the night until six the next morning, on the club\'s clock', () => {
        // Zurich in winter is UTC+1: 16:30 and 06:00 there
        const { from, to } = eveningWindow('2026-12-31', '19:30');
        expect([from.toISOString(), to.toISOString()]).toEqual(['2026-12-31T15:30:00.000Z', '2027-01-01T05:00:00.000Z']);
        const london = eveningWindow('2026-12-31', '19:30', 'Europe/London');
        expect([london.from.toISOString(), london.to.toISOString()]).toEqual(['2026-12-31T16:30:00.000Z', '2027-01-01T06:00:00.000Z']);
    });
});
