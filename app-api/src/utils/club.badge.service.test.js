import { describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

const stored = { _id: 'c1', badges: [], goals: [] };
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({ default: { club: { findById: vi.fn(async () => stored) }, mongoose: { isValidObjectId: () => true } } }));

const { clubOf } = await import('./club.badge.service.js');

describe('the club of the badges', () => {
    it('is loaded for an id, also an ObjectId (which has an _id of its own)', async () => {
        expect(await clubOf(new mongoose.Types.ObjectId())).toBe(stored);
        expect(await clubOf('64b000000000000000000001')).toBe(stored);
    });

    it('is the club itself when one is given', async () => {
        const club = { _id: 'c2', badges: [{ badge: 'x' }] };
        expect(await clubOf(club)).toBe(club);
    });
});
