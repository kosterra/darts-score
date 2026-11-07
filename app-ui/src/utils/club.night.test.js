import { describe, expect, it } from 'vitest';
import { cameAfter, eveningWindow } from './club.night';

describe('the window of a club evening', () => {
    it('runs from three hours before the night until six the next morning, on the club\'s clock', () => {
        // Zurich in winter is UTC+1: 16:30 and 06:00 there
        const { from, to } = eveningWindow('2026-12-31', '19:30');
        expect([from.toISOString(), to.toISOString()]).toEqual(['2026-12-31T15:30:00.000Z', '2027-01-01T05:00:00.000Z']);
        const london = eveningWindow('2026-12-31', '19:30', 'Europe/London');
        expect([london.from.toISOString(), london.to.toISOString()]).toEqual(['2026-12-31T16:30:00.000Z', '2027-01-01T06:00:00.000Z']);
    });
});

describe('who came later', () => {
    const now = new Date('2026-11-07T20:10:00Z');

    it('notes a player added from now, not those already there', () => {
        expect(cameAfter({}, ['a', 'b'], ['a', 'b', 'c'], now)).toEqual({ c: '2026-11-07T20:10:00.000Z' });
    });

    it('keeps when someone came, and forgets those taken out', () => {
        const came = { c: '2026-11-07T19:45:00.000Z', d: '2026-11-07T19:50:00.000Z' };
        expect(cameAfter(came, ['a', 'c', 'd'], ['a', 'c'], now)).toEqual({ c: '2026-11-07T19:45:00.000Z' });
    });

    it('a player taken out and added again came anew', () => {
        const out = cameAfter({ c: '2026-11-07T19:45:00.000Z' }, ['a', 'c'], ['a'], now);
        expect(cameAfter(out, ['a'], ['a', 'c'], now)).toEqual({ c: '2026-11-07T20:10:00.000Z' });
    });
});
