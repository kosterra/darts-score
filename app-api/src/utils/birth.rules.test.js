import { describe, it, expect } from 'vitest';
import { ageOn, ownBirthChange, selfBirthAge } from './birth.rules.js';

const day = new Date(2026, 9, 19);

describe('own date of birth', () => {
    it('counts whole years', () => {
        expect(ageOn('2008-10-19', day)).toBe(18);
        expect(ageOn('2008-10-20', day)).toBe(17);
        expect(ageOn(null, day)).toBeNull();
    });

    it('needs adults, or the highest Hall of Shame age of the clubs', () => {
        expect(selfBirthAge([])).toBe(18);
        expect(selfBirthAge([{ shameMinAge: 16 }, { shameMinAge: 21 }])).toBe(21);
    });

    it('lets adults correct it, but never to a child and never before the admins set it', () => {
        expect(ownBirthChange(null, '1987-02-04', 18, day).allowed).toBe(false);
        expect(ownBirthChange('1987-02-04', '1987-04-02', 18, day)).toEqual({ allowed: true, reason: '' });
        expect(ownBirthChange('2010-05-01', '1990-05-01', 18, day).allowed).toBe(false);
        expect(ownBirthChange('1987-02-04', '2012-02-04', 18, day)).toEqual({ allowed: false, reason: 'A date of birth under 18 years can only be set by your club admins.' });
        expect(ownBirthChange('2006-02-04', '2006-02-04', 21, day).allowed).toBe(false);
    });
});
