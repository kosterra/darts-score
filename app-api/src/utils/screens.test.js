import { describe, it, expect, vi } from 'vitest';

vi.mock('../models/db.model.js', () => ({ default: { mongoose: { isValidObjectId: (id) => /^[a-f0-9]{24}$/.test(id) } } }));
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
