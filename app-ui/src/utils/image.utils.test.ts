import { describe, it, expect } from 'vitest';
import { clampCropOffset, getCropSourceRect } from './image.utils';

describe('clampCropOffset', () => {
    it('keeps an offset that still covers the crop area', () => {
        expect(clampCropOffset({ x: 20, y: -10 }, 480, 300, 240)).toEqual({ x: 20, y: -10 });
    });
    it('limits the offset to half of the overflow on each axis', () => {
        expect(clampCropOffset({ x: 500, y: -500 }, 480, 300, 240)).toEqual({ x: 120, y: -30 });
    });
    it('allows no movement on an axis that exactly fits', () => {
        expect(clampCropOffset({ x: 50, y: 50 }, 480, 240, 240)).toEqual({ x: 50, y: 0 });
    });
});

describe('getCropSourceRect', () => {
    it('returns the centred square of a landscape image', () => {
        // 1000x500 shown at scale 0.48 -> 480x240 on screen
        expect(getCropSourceRect({ x: 0, y: 0 }, 1000, 500, 0.48, 240)).toEqual({ x: 250, y: 0, size: 500 });
    });
    it('moves the region opposite to the drag direction', () => {
        // dragging the image fully to the right reveals its left edge
        expect(getCropSourceRect({ x: 120, y: 0 }, 1000, 500, 0.48, 240)).toEqual({ x: 0, y: 0, size: 500 });
    });
    it('shrinks the region when zoomed in', () => {
        expect(getCropSourceRect({ x: 0, y: 0 }, 1000, 500, 0.96, 240)).toEqual({ x: 375, y: 125, size: 250 });
    });
});
