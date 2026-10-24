import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJSON } from './service.utils';

afterEach(() => vi.unstubAllGlobals());

describe('a request to the API', () => {
    it('says there is no connection when no answer comes at all', async () => {
        vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch'); });
        await expect(requestJSON('/api/admin/legal')).rejects.toMatchObject({
            message: 'No connection to the server. Check your internet connection and try again.',
            offline: true,
        });
    });

    it('gives the message of the API when it answers with an error', async () => {
        vi.stubGlobal('fetch', async () => ({ ok: false, status: 422, statusText: 'Unprocessable', json: async () => ({ message: 'A valid email address is required.' }) }));
        await expect(requestJSON('/api/admin/legal', { method: 'PUT', body: {} })).rejects.toMatchObject({ message: 'A valid email address is required.', status: 422 });
    });
});
