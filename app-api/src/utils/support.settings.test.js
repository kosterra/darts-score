import { describe, expect, it, vi, beforeEach } from 'vitest';

let stored = null;
vi.mock('../models/db.model.js', () => ({
    default: {
        setting: {
            findOne: () => ({ lean: async () => (stored ? { value: stored } : null) }),
            updateOne: async (query, { $set }) => { stored = $set.value; },
        },
    },
}));

const { PROJECT_SPONSORS, cleanUrl, saveSupportSettings, supportPage } = await import('./support.settings.js');

beforeEach(() => { stored = null; });

describe('the ways to support Oche', () => {
    it('only keep https addresses', () => {
        expect(cleanUrl(' https://ko-fi.com/oche ')).toBe('https://ko-fi.com/oche');
        expect(cleanUrl('http://ko-fi.com/oche')).toBe('');
        expect(cleanUrl('javascript:alert(1)')).toBe('');
        expect(cleanUrl('not a url')).toBe('');
    });

    it('show the project\'s sponsoring page, once when the installation links to it too', async () => {
        expect(await supportPage()).toEqual({ url: '', twint: '', project: PROJECT_SPONSORS });
        await saveSupportSettings({ url: PROJECT_SPONSORS, twint: 'https://pay.twint.example/oche', other: 'x' });
        expect(stored).toEqual({ url: PROJECT_SPONSORS, twint: 'https://pay.twint.example/oche' });
        expect(await supportPage()).toEqual({ url: PROJECT_SPONSORS, twint: 'https://pay.twint.example/oche', project: '' });
    });
});
