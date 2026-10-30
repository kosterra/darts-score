import { describe, it, expect } from 'vitest';
import { sortedPair, pairKey, otherClub } from './club.links.js';

describe('club links', () => {
    it('sorts a pair the same way whichever side asks', () => {
        expect(sortedPair('b', 'a')).toEqual(['a', 'b']);
        expect(pairKey('b', 'a')).toBe('a_b');
        expect(pairKey('a', 'b')).toBe('a_b');
    });

    it('finds the other club of a connection from one of its clubs', () => {
        const link = { clubs: ['a', 'b'] };
        expect(otherClub(link, 'a')).toBe('b');
        expect(otherClub(link, 'b')).toBe('a');
    });
});
