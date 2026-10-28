import { describe, expect, it } from 'vitest';
import { eveningWindow } from './club.night';

describe('the window of a club evening', () => {
    it('runs from three hours before the night until six the next morning, in local time', () => {
        const { from, to } = eveningWindow('2026-12-31', '19:30');
        expect([from.getFullYear(), from.getMonth(), from.getDate(), from.getHours(), from.getMinutes()]).toEqual([2026, 11, 31, 16, 30]);
        expect([to.getFullYear(), to.getMonth(), to.getDate(), to.getHours()]).toEqual([2027, 0, 1, 6]);
    });
});
