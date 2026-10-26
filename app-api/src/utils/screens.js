import { createHmac, timingSafeEqual } from 'node:crypto';
import db from '../models/db.model.js';
import { getSessionSecret } from './auth.utils.js';

/**
 * The big screen of a running game: a TV or a second tablet at the club
 * follows it without logging in, through a link (and its QR code) that a
 * member of the club makes from the game. The link is signed and lasts a
 * few hours; it shows that game and nothing else.
 */

export const SCREEN_HOURS = 12;
export const SCREEN_KINDS = ['x01'];

const sign = (payload) => createHmac('sha256', `screen:${getSessionSecret()}`).update(payload).digest('base64url');

// → { token, expiresAt } for a game of a kind
export const screenToken = (kind, gameId, now = Date.now()) => {
    const expiresAt = now + SCREEN_HOURS * 60 * 60 * 1000;
    const payload = Buffer.from(JSON.stringify([kind, String(gameId), expiresAt])).toString('base64url');
    return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(expiresAt) };
};

// → { kind, gameId, expiresAt } or null: not ours, changed, of another kind, or run out
export const readScreenToken = (token, now = Date.now()) => {
    const [payload, signature] = String(token ?? '').split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
        const [kind, gameId, expiresAt] = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!SCREEN_KINDS.includes(kind) || !db.mongoose.isValidObjectId(gameId) || typeof expiresAt !== 'number' || expiresAt < now) return null;
        return { kind, gameId, expiresAt: new Date(expiresAt) };
    } catch {
        return null;
    }
};
