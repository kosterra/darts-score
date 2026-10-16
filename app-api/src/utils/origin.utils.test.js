import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './origin.utils.js';

describe('isAllowedOrigin', () => {
    it('allows requests without an Origin header', () => {
        expect(isAllowedOrigin({ host: 'darts.example.com' })).toBe(true);
    });

    it('allows the app itself, also with a port and behind a proxy', () => {
        expect(isAllowedOrigin({ origin: 'http://server:3001', host: 'server:3001' })).toBe(true);
        expect(isAllowedOrigin({ origin: 'https://darts.example.com', host: 'darts_score:3001', forwardedHost: 'darts.example.com' })).toBe(true);
    });

    it('allows the configured addresses, with or without a trailing slash', () => {
        expect(isAllowedOrigin({ origin: 'http://localhost:3000', host: 'localhost:3001', allowedOrigins: ['http://localhost:3000/'] })).toBe(true);
        expect(isAllowedOrigin({ origin: 'https://darts.example.com', host: 'internal:3001', allowedOrigins: ['https://darts.example.com'] })).toBe(true);
    });

    it('refuses other sites', () => {
        expect(isAllowedOrigin({ origin: 'https://evil.example', host: 'darts.example.com', allowedOrigins: ['https://darts.example.com'] })).toBe(false);
        expect(isAllowedOrigin({ origin: 'http://server:3002', host: 'server:3001' })).toBe(false);
        expect(isAllowedOrigin({ origin: 'not a url', host: 'server:3001' })).toBe(false);
    });
});
