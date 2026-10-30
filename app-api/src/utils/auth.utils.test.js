import { describe, it, expect } from 'vitest';
import { scryptSync } from 'crypto';
import { hashPassword, verifyPassword, needsRehash, readSession, SESSION_COOKIE } from './auth.utils.js';

describe('password hashing', () => {
    it('verifies the password it was created from', async () => {
        const hash = await hashPassword('correct horse');
        expect(await verifyPassword('correct horse', hash)).toBe(true);
    });
    it('makes the current scrypt$ format, which needs no re-hash', async () => {
        const hash = await hashPassword('correct horse');
        expect(hash.startsWith('scrypt$')).toBe(true);
        expect(needsRehash(hash)).toBe(false);
    });
    it('still verifies the earlier salt:hash format and flags it for re-hashing', async () => {
        const salt = 'abcdef0123456789';
        const legacy = `${salt}:${scryptSync('correct horse', salt, 64).toString('hex')}`;
        expect(await verifyPassword('correct horse', legacy)).toBe(true);
        expect(await verifyPassword('wrong horse', legacy)).toBe(false);
        expect(needsRehash(legacy)).toBe(true);
    });
    it('rejects a wrong password', async () => {
        const hash = await hashPassword('correct horse');
        expect(await verifyPassword('wrong horse', hash)).toBe(false);
    });
    it('salts every hash', async () => {
        expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
    });
    it('rejects malformed stored values', async () => {
        expect(await verifyPassword('x', '')).toBe(false);
        expect(await verifyPassword('x', 'no-separator')).toBe(false);
        expect(await verifyPassword('x', 'salt:abcd')).toBe(false);
    });
});

describe('readSession', () => {
    const request = (session) => ({ signedCookies: { [SESSION_COOKIE]: session } });

    it('returns a valid session', () => {
        const session = { uid: 'abc', v: 0, exp: Date.now() + 1000 };
        expect(readSession(request(session))).toEqual(session);
    });
    it('rejects an expired session', () => {
        expect(readSession(request({ uid: 'abc', v: 0, exp: Date.now() - 1 }))).toBeNull();
    });
    it('rejects a missing or tampered cookie', () => {
        expect(readSession({ signedCookies: {} })).toBeNull();
        expect(readSession(request(false))).toBeNull();
        expect(readSession(request({ uid: 5, exp: Date.now() + 1000 }))).toBeNull();
    });
});
