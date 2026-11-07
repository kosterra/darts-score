import { describe, expect, it } from 'vitest';
import { SAVE_ATTEMPTS, untilSaved } from './retry.js';

const versionError = () => Object.assign(new Error('No matching document'), { name: 'VersionError' });

describe('saving again after a lost race', () => {
    it('runs the work again until it is saved, with the number of the attempt', async () => {
        const seen = [];
        const result = await untilSaved(async (attempt) => {
            seen.push(attempt);
            if (attempt < 3) throw versionError();
            return 'saved';
        }, { pause: 0 });
        expect(result).toBe('saved');
        expect(seen).toEqual([0, 1, 2, 3]);
    });

    it('gives up after the last attempt', async () => {
        let runs = 0;
        await expect(untilSaved(async () => {
            runs += 1;
            throw versionError();
        }, { pause: 0 })).rejects.toMatchObject({ name: 'VersionError' });
        expect(runs).toBe(SAVE_ATTEMPTS);
    });

    it('does not run again for any other error', async () => {
        let runs = 0;
        await expect(untilSaved(async () => {
            runs += 1;
            throw new Error('broken');
        })).rejects.toThrow('broken');
        expect(runs).toBe(1);
    });
});
