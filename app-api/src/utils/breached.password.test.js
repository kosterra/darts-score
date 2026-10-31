import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../models/logger.model.js', () => ({ default: logger }));

const { isBreachedPassword, isCheckEnabled, resetFailureLog, RANGE_URL } = await import('./breached.password.js');

const sha1 = (password) => createHash('sha1').update(password).digest('hex').toUpperCase();
const PASSWORD = 'password';
const HASH = sha1(PASSWORD);
// a range answer: padding (count 0), another hash, and the one asked about
const answer = (count) => [
    `${sha1('something else').slice(5)}:12`,
    `${HASH.slice(5)}:${count}`,
    'ABCDEFABCDEFABCDEFABCDEFABCDEFABCDE:0',
].join('\r\n');

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('BREACHED_PASSWORD_CHECK', 'on');
    fetchMock.mockReset();
    logger.warn.mockClear();
    logger.debug.mockClear();
    resetFailureLog();
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

describe('isBreachedPassword', () => {
    it('asks the range API with the first five hex characters of the SHA-1 only, with padding', async () => {
        fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => answer(3861493) });
        expect(await isBreachedPassword(PASSWORD)).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe(`${RANGE_URL}${HASH.slice(0, 5)}`);
        expect(url).not.toContain(HASH.slice(5));
        expect(options.headers['Add-Padding']).toBe('true');
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('is false when the suffix is not in the answer', async () => {
        fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => `${sha1('other').slice(5)}:5\r\nABCDEFABCDEFABCDEFABCDEFABCDEFABCDE:0` });
        expect(await isBreachedPassword(PASSWORD)).toBe(false);
    });

    it('is false when the suffix is only a padding line (count 0)', async () => {
        fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => answer(0) });
        expect(await isBreachedPassword(PASSWORD)).toBe(false);
    });

    it('fails open on a network error, warning once', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));
        expect(await isBreachedPassword(PASSWORD)).toBe(false);
        expect(await isBreachedPassword(PASSWORD)).toBe(false);
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn.mock.calls[0][1]).toMatch(/could not be reached/);
        expect(logger.debug).toHaveBeenCalledTimes(1);
    });

    it('fails open when the API answers with an error status', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 503, text: async () => '' });
        expect(await isBreachedPassword(PASSWORD)).toBe(false);
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn.mock.calls[0][1]).toMatch(/503/);
    });

    it('fails open after 3 seconds without an answer', async () => {
        vi.useFakeTimers();
        fetchMock.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        }));
        const pending = isBreachedPassword(PASSWORD);
        await vi.advanceTimersByTimeAsync(3000);
        expect(await pending).toBe(false);
        expect(logger.warn.mock.calls[0][1]).toMatch(/within 3 s/);
    });

    it('does not call the network when turned off, or in tests without BREACHED_PASSWORD_CHECK=on', async () => {
        vi.stubEnv('BREACHED_PASSWORD_CHECK', 'off');
        expect(isCheckEnabled()).toBe(false);
        expect(await isBreachedPassword(PASSWORD)).toBe(false);
        vi.stubEnv('BREACHED_PASSWORD_CHECK', '');
        vi.stubEnv('NODE_ENV', 'test');
        expect(isCheckEnabled()).toBe(false);
        expect(await isBreachedPassword(PASSWORD)).toBe(false);
        vi.stubEnv('NODE_ENV', 'production');
        expect(isCheckEnabled()).toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('is false for an empty or missing password without asking', async () => {
        expect(await isBreachedPassword('')).toBe(false);
        expect(await isBreachedPassword(undefined)).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
