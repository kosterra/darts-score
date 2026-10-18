import { describe, expect, it } from 'vitest';
import { formatTrainingTime, toHundredths } from './training.time';

describe('formatTrainingTime', () => {
    it('shows minutes, seconds and hundredths', () => {
        expect(formatTrainingTime(8345)).toBe('1:23.45');
        expect(formatTrainingTime(905)).toBe('0:09.05');
        expect(formatTrainingTime(360000)).toBe('60:00.00');
    });

    it('shows fewer decimals on request', () => {
        expect(formatTrainingTime(8345, 1)).toBe('1:23.4');
        expect(formatTrainingTime(905, 0)).toBe('0:09');
    });

    it('shows a dash without a time', () => {
        expect(formatTrainingTime(null)).toBe('–');
    });
});

describe('toHundredths', () => {
    it('counts whole hundredths', () => {
        expect(toHundredths(83459)).toBe(8345);
        expect(toHundredths(3)).toBe(1);
    });
});
