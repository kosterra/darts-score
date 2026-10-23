import { afterEach, describe, expect, it } from 'vitest';
import { calendarFormat, dateFormat, formatDate, languageFormat } from './dates';
import { connectGamePreferences } from './game.preferences';

const when = '2026-10-24T18:05:09';

describe('dates', () => {
    afterEach(() => connectGamePreferences(null, null));

    it('use the usual format of the language', () => {
        expect(languageFormat('de')).toBe('DD.MM.YYYY');
        expect(dateFormat('fr')).toBe('DD/MM/YYYY');
        expect(formatDate(when)).toBe('24/10/2026');
    });

    it('use the format the player chose, with the time, a short year or none', () => {
        connectGamePreferences({ dateFormat: 'MM/DD/YYYY' }, null);
        expect(dateFormat()).toBe('MM/DD/YYYY');
        expect(formatDate(when, { time: true })).toBe('10/24/2026 18:05');
        expect(formatDate(when, { year: 'short' })).toBe('10/24/26');
        expect(formatDate(when, { year: 'none' })).toBe('10/24');
        expect(calendarFormat()).toBe('mm/dd/yy');
        connectGamePreferences({ dateFormat: 'YYYY-MM-DD' }, null);
        expect(formatDate(when, { time: true, seconds: true })).toBe('2026-10-24 18:05:09');
        expect(formatDate(null)).toBe('–');
    });
});
