import { describe, it, expect } from 'vitest';
import { dartAt, pointForDart, seededRandom } from './dartboard.geometry';

describe('dartboard geometry', () => {
    it('finds the field of a point, as the board draws it', () => {
        expect(dartAt({ x: 210, y: 210 })).toBe('D25');
        expect(dartAt({ x: 210, y: 210 - 30 })).toBe('S25');
        expect(dartAt({ x: 210, y: 210 - 96 })).toBe('T20');
        expect(dartAt({ x: 210 + 160, y: 210 })).toBe('D6');
        expect(dartAt({ x: 210, y: 210 + 60 })).toBe('S3');
        expect(dartAt({ x: 210 + 190, y: 210 })).toBe('0');
    });

    it('puts every dart inside its own field, never on a wire', () => {
        const random = seededRandom('fields');
        const darts = ['D25', 'S25', '0', ...[20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5].flatMap(n => [`S${n}`, `D${n}`, `T${n}`])];
        for (const dart of darts) {
            for (let i = 0; i < 25; i++) expect(dartAt(pointForDart(dart, random))).toBe(dart);
        }
    });

    it('gives the same point for the same seed', () => {
        expect(pointForDart('T19', seededRandom('visit-1-0'))).toEqual(pointForDart('T19', seededRandom('visit-1-0')));
    });
});
