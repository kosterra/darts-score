import { describe, it, expect, vi } from 'vitest';

// the pairings of the TVs, in memory
const pairings = [];
const matches = (entry, query) => Object.entries(query).every(([key, value]) => (value?.$gt ? entry[key] > value.$gt : entry[key] === value));
vi.mock('../models/db.model.js', () => ({ default: {
    mongoose: { isValidObjectId: (id) => /^[a-f0-9]{24}$/.test(id) },
    screenPairing: {
        exists: async (query) => pairings.some(entry => matches(entry, query)),
        create: async (doc) => { pairings.push({ gameToken: null, ...doc }); return doc; },
        findOne: (query) => ({ lean: async () => pairings.find(entry => matches(entry, query)) ?? null }),
        updateOne: async (query, { $set }) => {
            const found = pairings.find(entry => matches(entry, query));
            if (found) Object.assign(found, $set);
            return { matchedCount: found ? 1 : 0, modifiedCount: found ? 1 : 0 };
        },
    },
} }));
vi.mock('./auth.utils.js', () => ({ getSessionSecret: () => 'secret' }));

const { SCREEN_HOURS, readScreenToken, screenToken } = await import('./screens.js');
const GAME = '6650a1b2c3d4e5f6a7b8c9d0';
const NOW = Date.UTC(2026, 9, 26, 18, 0, 0);

describe('the links of the big screen', () => {
    it('open the game they were made for, for some hours', () => {
        const { token, expiresAt } = screenToken('x01', GAME, NOW);
        expect(readScreenToken(token, NOW)).toEqual({ kind: 'x01', gameId: GAME, expiresAt });
        expect(readScreenToken(token, NOW + (SCREEN_HOURS - 1) * 3600e3)).not.toBeNull();
        expect(readScreenToken(token, NOW + (SCREEN_HOURS + 1) * 3600e3)).toBeNull();
    });

    it('open nothing when changed or made up', () => {
        const { token } = screenToken('x01', GAME, NOW);
        const [payload, signature] = token.split('.');
        const other = Buffer.from(JSON.stringify(['x01', '6650a1b2c3d4e5f6a7b8c9d1', NOW + 3600e3])).toString('base64url');
        expect(readScreenToken(`${other}.${signature}`, NOW)).toBeNull();
        expect(readScreenToken(`${payload}.${signature.slice(0, -2)}xx`, NOW)).toBeNull();
        expect(readScreenToken('nonsense', NOW)).toBeNull();
    });
});

describe('a TV paired by its code', () => {
    it('gets a code, and shows the game sent to that code until the pairing runs out', async () => {
        const { newPairing, pairingOf, sendToPairing, readScreenToken: read } = await import('./screens.js');
        const now = new Date(NOW);
        const tv = await newPairing(now);
        expect(tv.code).toMatch(/^\d{6}$/);
        expect(await pairingOf(tv.secret, now)).toMatchObject({ code: tv.code, token: null });

        expect(await sendToPairing('000000' === tv.code ? '111111' : '000000', 'x01', GAME, now)).toBe(false);
        expect(await sendToPairing(tv.code, 'x01', GAME, now)).toBe(true);
        const { token } = await pairingOf(tv.secret, now);
        expect(read(token, NOW)).toMatchObject({ kind: 'x01', gameId: GAME });

        expect(await pairingOf('another-secret-of-another-tv', now)).toBeNull();
        expect(await pairingOf(tv.secret, new Date(NOW + 13 * 3600e3))).toBeNull();
    });
});
