import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
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

// ---------------------------------------------------------------------------
// A TV paired by a code: it opens /tv once, shows a code, and every game sent
// to that code appears on it, for the evening
// ---------------------------------------------------------------------------

export const PAIRING_HOURS = 12;
const hashOf = (secret) => createHash('sha256').update(String(secret)).digest('hex');

// a new pairing with a code no other TV shows now: { secret, code, expiresAt }
export const newPairing = async (now = new Date()) => {
    const secret = randomBytes(24).toString('base64url');
    const expiresAt = new Date(now.getTime() + PAIRING_HOURS * 60 * 60 * 1000);
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        if (await db.screenPairing.exists({ code, expiresAt: { $gt: now } })) continue;
        await db.screenPairing.create({ code, secretHash: hashOf(secret), expiresAt });
        return { secret, code, expiresAt };
    }
    throw new Error('No free code for a TV, try again.');
};

// the pairing of a TV by its secret, while it lasts: { code, expiresAt, token } or null
export const pairingOf = async (secret, now = new Date()) => {
    const pairing = await db.screenPairing.findOne({ secretHash: hashOf(secret), expiresAt: { $gt: now } }).lean();
    if (!pairing) return null;
    // the game's own link may run out before the pairing does
    const token = pairing.gameToken && readScreenToken(pairing.gameToken, now.getTime()) ? pairing.gameToken : null;
    return { code: pairing.code, expiresAt: pairing.expiresAt, token };
};

// sends a game to the TV showing a code: true, or false when no TV shows it
export const sendToPairing = async (code, kind, gameId, now = new Date()) => {
    const { token } = screenToken(kind, gameId, now.getTime());
    const { modifiedCount, matchedCount } = await db.screenPairing.updateOne(
        { code: String(code), expiresAt: { $gt: now } },
        { $set: { gameToken: token } },
    );
    return matchedCount > 0 || modifiedCount > 0;
};
