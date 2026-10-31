import { describe, it, expect } from 'vitest';
import { scryptSync } from 'crypto';
import { hashPassword, verifyPassword, needsRehash, readSession, cookieOptions, readPending, isTrustedDevice, SESSION_COOKIE, PENDING_COOKIE, TRUST_COOKIE } from './auth.utils.js';

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
    it('still verifies a hash with weaker scrypt parameters and flags it for re-hashing', async () => {
        const salt = 'abcdef0123456789';
        const weakerN = `scrypt$16384$8$1$${salt}$${scryptSync('correct horse', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;
        expect(await verifyPassword('correct horse', weakerN)).toBe(true);
        expect(await verifyPassword('wrong horse', weakerN)).toBe(false);
        expect(needsRehash(weakerN)).toBe(true);
        // each work factor on its own
        expect(needsRehash(`scrypt$32768$4$1$${salt}$00`)).toBe(true);
        expect(needsRehash(`scrypt$32768$8$0$${salt}$00`)).toBe(true);
        expect(needsRehash(`scrypt$32768$8$1$${salt}$00`)).toBe(false);
    });
});

describe('cookieOptions', () => {
    const request = (secure, forwardedProto) => ({ secure, get: (header) => (header === 'x-forwarded-proto' ? forwardedProto : undefined) });

    it('makes a signed, http-only, lax cookie for the whole site', () => {
        expect(cookieOptions(request(false))).toEqual({ signed: true, httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
    });
    it('marks the cookie secure on https, also behind a proxy that says so', () => {
        expect(cookieOptions(request(true)).secure).toBe(true);
        expect(cookieOptions(request(false, 'https')).secure).toBe(true);
        expect(cookieOptions(request(false, 'http')).secure).toBe(false);
    });
});

describe('readPending', () => {
    const request = (pending) => ({ signedCookies: { [PENDING_COOKIE]: pending } });

    it('returns a login that still waits for its second step', () => {
        const pending = { uid: 'abc', v: 0, step: 'code', exp: Date.now() + 60000 };
        expect(readPending(request(pending))).toEqual(pending);
    });
    it('rejects an expired one', () => {
        expect(readPending(request({ uid: 'abc', v: 0, step: 'code', exp: Date.now() - 1 }))).toBeNull();
    });
    it('rejects a missing or malformed cookie', () => {
        expect(readPending({ signedCookies: {} })).toBeNull();
        expect(readPending({})).toBeNull();
        expect(readPending(request('code'))).toBeNull();
        expect(readPending(request({ uid: 5, step: 'code', exp: Date.now() + 60000 }))).toBeNull();
        expect(readPending(request({ uid: 'abc', step: 'code', exp: 'never' }))).toBeNull();
    });
});

describe('isTrustedDevice', () => {
    const user = { _id: 'abc', mfa: { trustSalt: 'salt-1' } };
    const request = (trust) => ({ signedCookies: { [TRUST_COOKIE]: trust } });
    const trust = (fields = {}) => ({ uid: 'abc', t: 'salt-1', exp: Date.now() + 60000, ...fields });

    it('knows a device the account trusted', () => {
        expect(isTrustedDevice(request(trust()), user)).toBe(true);
    });
    it('refuses the cookie of another account', () => {
        expect(isTrustedDevice(request(trust({ uid: 'xyz' })), user)).toBe(false);
        expect(isTrustedDevice(request(trust()), { ...user, _id: 'xyz' })).toBe(false);
    });
    it('refuses a cookie from before the trust was withdrawn (a rotated salt), or without a salt', () => {
        expect(isTrustedDevice(request(trust({ t: 'salt-0' })), user)).toBe(false);
        expect(isTrustedDevice(request(trust()), { _id: 'abc', mfa: { trustSalt: 'salt-2' } })).toBe(false);
        expect(isTrustedDevice(request(trust({ t: '' })), { _id: 'abc', mfa: { trustSalt: '' } })).toBe(false);
        expect(isTrustedDevice(request(trust()), { _id: 'abc' })).toBe(false);
    });
    it('refuses an expired, missing or malformed cookie', () => {
        expect(isTrustedDevice(request(trust({ exp: Date.now() - 1 })), user)).toBe(false);
        expect(isTrustedDevice({ signedCookies: {} }, user)).toBe(false);
        expect(isTrustedDevice({}, user)).toBe(false);
        expect(isTrustedDevice(request('salt-1'), user)).toBe(false);
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
