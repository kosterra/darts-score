import { describe, it, expect } from 'vitest';
import {
    validateDartValue,
    dartIsDouble,
    dartIsTriple,
    lastDartIsDouble,
    lastDartIsTriple,
    getCurrentThrowScore,
    cricketGetCurrentScore,
} from './game.utils';

describe('validateDartValue', () => {
    it('returns true for empty string', () => {
        expect(validateDartValue('')).toBe(true);
    });
    it('returns true for 0', () => {
        expect(validateDartValue('0')).toBe(true);
    });
    it('returns true for valid singles (S1–S20)', () => {
        expect(validateDartValue('S1')).toBe(true);
        expect(validateDartValue('S20')).toBe(true);
        expect(validateDartValue('s5')).toBe(true);
    });
    it('returns true for valid doubles (D1–D20, D25)', () => {
        expect(validateDartValue('D20')).toBe(true);
        expect(validateDartValue('D25')).toBe(true);
    });
    it('returns true for valid trebles (T1–T20)', () => {
        expect(validateDartValue('T20')).toBe(true);
    });
    it('returns false for treble bull (T25 is not valid)', () => {
        expect(validateDartValue('T25')).toBe(false);
    });
    it('returns false for out-of-range values', () => {
        expect(validateDartValue('S21')).toBe(false);
        expect(validateDartValue('D26')).toBe(false);
    });
    it('returns false for invalid formats', () => {
        expect(validateDartValue('X10')).toBe(false);
        expect(validateDartValue('20')).toBe(false);
        expect(validateDartValue('D')).toBe(false);
    });
});

describe('dartIsDouble', () => {
    it('returns true for D-prefixed values', () => {
        expect(dartIsDouble('D20')).toBe(true);
        expect(dartIsDouble('d10')).toBe(true);
    });
    it('returns false for S and T prefix', () => {
        expect(dartIsDouble('S20')).toBe(false);
        expect(dartIsDouble('T20')).toBe(false);
    });
    it('returns false for empty string', () => {
        expect(dartIsDouble('')).toBe(false);
    });
});

describe('dartIsTriple', () => {
    it('returns true for T-prefixed values', () => {
        expect(dartIsTriple('T20')).toBe(true);
        expect(dartIsTriple('t10')).toBe(true);
    });
    it('returns false for S and D prefix', () => {
        expect(dartIsTriple('S20')).toBe(false);
        expect(dartIsTriple('D20')).toBe(false);
    });
});

describe('lastDartIsDouble', () => {
    it('detects double in last non-empty slot', () => {
        expect(lastDartIsDouble(['T20', 'S5', 'D16'])).toBe(true);
    });
    it('returns false when last dart is not double', () => {
        expect(lastDartIsDouble(['D20', 'S5', ''])).toBe(false);
    });
    it('works with partially filled throw', () => {
        expect(lastDartIsDouble(['D20', '', ''])).toBe(true);
    });
    it('returns false for empty throw', () => {
        expect(lastDartIsDouble(['', '', ''])).toBe(false);
    });
});

describe('lastDartIsTriple', () => {
    it('detects triple in last non-empty slot', () => {
        expect(lastDartIsTriple(['S1', 'T20', ''])).toBe(true);
    });
    it('returns false when last dart is not triple', () => {
        expect(lastDartIsTriple(['T20', 'S5', ''])).toBe(false);
    });
});

describe('getCurrentThrowScore', () => {
    it('returns 0 for empty throw', () => {
        expect(getCurrentThrowScore(['', '', ''])).toBe(0);
        expect(getCurrentThrowScore([])).toBe(0);
    });
    it('calculates single correctly', () => {
        expect(getCurrentThrowScore(['S20', '', ''])).toBe(20);
    });
    it('calculates double correctly', () => {
        expect(getCurrentThrowScore(['D10', '', ''])).toBe(20);
    });
    it('calculates treble correctly', () => {
        expect(getCurrentThrowScore(['T20', '', ''])).toBe(60);
    });
    it('sums a full three-dart throw', () => {
        // T20 (60) + S5 (5) + D10 (20) = 85
        expect(getCurrentThrowScore(['T20', 'S5', 'D10'])).toBe(85);
    });
    it('handles bull (S25 = 25, D25 = 50)', () => {
        expect(getCurrentThrowScore(['S25', '', ''])).toBe(25);
        expect(getCurrentThrowScore(['D25', '', ''])).toBe(50);
    });
    it('skips empty slots', () => {
        expect(getCurrentThrowScore(['T20', '', 'S5'])).toBe(65);
    });
    it('handles maximum score (T20 + T20 + T20 = 180)', () => {
        expect(getCurrentThrowScore(['T20', 'T20', 'T20'])).toBe(180);
    });
});

describe('cricketGetCurrentScore', () => {
    it('returns existing score when no darts thrown', () => {
        expect(cricketGetCurrentScore(['', '', ''], 42, {})).toBe(42);
    });
    it('counts score from overclosed sections', () => {
        // section 20 closed with 4 hits → 1 extra hit → +20
        const sectionHit = { 20: 4 };
        expect(cricketGetCurrentScore(['T20', '', ''], 0, sectionHit)).toBe(20);
    });
    it('returns 0 when all sections have ≤3 hits', () => {
        const sectionHit = { 20: 3, 19: 2 };
        expect(cricketGetCurrentScore(['S20', '', ''], 0, sectionHit)).toBe(0);
    });
});
