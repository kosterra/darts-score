import { describe, it, expect } from 'vitest';
import { cappedExpiry } from './session.settings.js';

const HOUR = 60 * 60 * 1000;

describe('session expiry', () => {
    it('keeps a session ending within the timeout', () => {
        expect(cappedExpiry(1000 + 2 * HOUR, 1000, 5 * HOUR)).toEqual({ exp: 1000 + 2 * HOUR, cut: false });
    });

    it('cuts a longer session, e.g. a 30-day cookie or after the timeout was lowered', () => {
        expect(cappedExpiry(1000 + 30 * 24 * HOUR, 1000, 5 * HOUR)).toEqual({ exp: 1000 + 5 * HOUR, cut: true });
    });
});
