import { describe, it, expect } from 'vitest';
import { countdown, sessionPhase, warningMs } from './session.timing';

describe('session timing', () => {
    it('warns ten minutes ahead, or a quarter of a short session', () => {
        expect(warningMs(5)).toBe(10 * 60 * 1000);
        expect(warningMs(0.5)).toBe(7.5 * 60 * 1000);
    });

    it('tells when to warn and when it ended', () => {
        const warn = 10 * 60 * 1000;
        expect(sessionPhase(null, 0, warn)).toBe('ok');
        expect(sessionPhase(60 * 60 * 1000, 0, warn)).toBe('ok');
        expect(sessionPhase(9 * 60 * 1000, 0, warn)).toBe('warn');
        expect(sessionPhase(1000, 1000, warn)).toBe('ended');
    });

    it('counts down in minutes and seconds', () => {
        expect(countdown(545 * 1000)).toBe('9:05');
        expect(countdown(400)).toBe('0:01');
        expect(countdown(-5)).toBe('0:00');
    });
});
