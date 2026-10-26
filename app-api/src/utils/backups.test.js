import { describe, it, expect, vi } from 'vitest';

vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../models/db.model.js', async () => {
    const mongoose = (await import('mongoose')).default;
    return { default: { mongoose, setting: { findOne: () => ({ lean: async () => null }), updateOne: async () => ({}) } } };
});
const { backupName, parseName, backupPath, lastDueAt, nextDueAt } = await import('./backups.js');

describe('the names of backups', () => {
    it('say when and how a backup was made', () => {
        const name = backupName('auto', new Date(2026, 9, 25, 3, 4, 5));
        expect(name).toBe('legmate-20261025-030405-auto.json.gz');
        expect(parseName(name)).toEqual({ name, kind: 'auto', createdAt: new Date(2026, 9, 25, 3, 4, 5) });
    });

    it('lead to nothing else on the server', () => {
        expect(parseName('../../etc/passwd')).toBeNull();
        expect(parseName('legmate-20261025-030405-auto.json.gz.part')).toBeNull();
        expect(() => backupPath('../index.js')).toThrow(/no such backup/);
    });
});

describe('the schedule', () => {
    const daily = { frequency: 'daily', hour: 3, weekday: 1 };
    const weekly = { frequency: 'weekly', hour: 3, weekday: 1 };   // Mondays

    it('is due daily at the hour: today once it is past, else yesterday', () => {
        expect(lastDueAt(daily, new Date(2026, 9, 25, 10, 0))).toEqual(new Date(2026, 9, 25, 3, 0));
        expect(lastDueAt(daily, new Date(2026, 9, 25, 2, 0))).toEqual(new Date(2026, 9, 24, 3, 0));
        expect(nextDueAt(daily, new Date(2026, 9, 25, 10, 0))).toEqual(new Date(2026, 9, 26, 3, 0));
    });

    it('is due weekly on its day at the hour', () => {
        // Sunday 25 October 2026: the Monday before, the 19th
        expect(lastDueAt(weekly, new Date(2026, 9, 25, 10, 0))).toEqual(new Date(2026, 9, 19, 3, 0));
        expect(nextDueAt(weekly, new Date(2026, 9, 25, 10, 0))).toEqual(new Date(2026, 9, 26, 3, 0));
        // Monday before the hour: still the week before
        expect(lastDueAt(weekly, new Date(2026, 9, 26, 2, 0))).toEqual(new Date(2026, 9, 19, 3, 0));
    });
});
