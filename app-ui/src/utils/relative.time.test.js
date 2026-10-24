import { describe, expect, it } from 'vitest';
import { relativeTime } from './relative.time';

describe('relative time', () => {
    const now = new Date(2026, 9, 24, 20, 0).getTime();
    it('says how long ago or ahead, in the language', () => {
        expect(relativeTime(now - 20 * 1000, now, 'en')).toBe('this minute');
        expect(relativeTime(now - 3 * 60 * 1000, now, 'en')).toBe('3 minutes ago');
        expect(relativeTime(now + 2 * 60 * 60 * 1000, now, 'en')).toBe('in 2 hours');
        expect(relativeTime(now - 3 * 60 * 1000, now, 'de')).toBe('vor 3 Minuten');
    });
});
