import { describe, expect, it, vi } from 'vitest';

vi.mock('../models/db.model.js', () => ({ default: {} }));
vi.mock('./quick.tally.js', () => ({ countEvening: vi.fn() }));
const { endOf, EVENING_ENDS_AFTER_HOURS } = await import('./evenings.js');

const HOUR = 60 * 60 * 1000;
const start = new Date('2026-10-30T19:00:00Z');
const at = (hours) => new Date(start.getTime() + hours * HOUR);

describe('the end of a darts evening', () => {
    it('goes on until 12 hours after its last game, then ends by itself at that time', () => {
        const games = [{ createdAt: at(0.5), updatedAt: at(1) }, { createdAt: at(2), updatedAt: at(3) }];
        expect(EVENING_ENDS_AFTER_HOURS).toBe(12);
        expect(endOf({ createdAt: start }, games, at(10))).toEqual({ endedAt: null, endsAt: at(15) });
        expect(endOf({ createdAt: start }, games, at(16))).toEqual({ endedAt: at(15), endsAt: null });
    });

    it('without a game, 12 hours after its start', () => {
        expect(endOf({ createdAt: start }, [], at(13)).endedAt).toEqual(at(12));
    });

    it('ended by hand or made a club, at that moment', () => {
        expect(endOf({ createdAt: start, endedAt: at(4) }, [], at(5))).toEqual({ endedAt: at(4), endsAt: null });
        expect(endOf({ createdAt: start, adoptedAt: at(2) }, [], at(3)).endedAt).toEqual(at(2));
    });
});
