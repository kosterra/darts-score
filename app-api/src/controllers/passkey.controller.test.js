import { describe, it, expect, vi, beforeEach } from 'vitest';

// the accounts, the security notices and what the passkey check answers, in memory
const users = [];
const security = [];
let verified = true;
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../utils/notify.js', () => ({ notifySecurity: (user, kind) => { security.push(kind); } }));
vi.mock('../utils/spam.guard.js', () => ({ noteLoginFailure: async () => {} }));
vi.mock('../utils/mail.utils.js', () => ({ getAppUrl: () => 'https://legmate.example' }));
vi.mock('./mfa.controller.js', () => ({ startSession: async (req, res, user) => res.json({ session: String(user._id) }) }));
vi.mock('../models/db.model.js', () => ({
    default: {
        user: {
            exists: async (query) => users.some(user => user.passkeys.some(passkey => passkey.credentialId === query['passkeys.credentialId'])),
            findOne: async (query) => users.find(user => user.passkeys.some(passkey => passkey.credentialId === query['passkeys.credentialId'])) ?? null,
            // the one-step update of a used code of two-step login (utils/mfa.js)
            updateOne: async (query, update) => {
                const user = users.find(entry => String(entry._id) === String(query._id));
                if (!user || (user.mfa.lastStep != null && user.mfa.lastStep >= update.$set['mfa.lastStep'])) return { modifiedCount: 0 };
                user.mfa.lastStep = update.$set['mfa.lastStep'];
                return { modifiedCount: 1 };
            },
        },
    },
}));
process.env.MFA_KEY = 'test key';
// every ceremony gets a challenge of its own, as the library makes them
let ceremonies = 0;
vi.mock('@simplewebauthn/server', () => ({
    generateRegistrationOptions: async ({ rpID }) => ({ challenge: `reg-challenge-${++ceremonies}`, rp: { id: rpID } }),
    generateAuthenticationOptions: async ({ rpID }) => ({ challenge: `login-challenge-${++ceremonies}`, rpId: rpID }),
    verifyRegistrationResponse: async ({ expectedChallenge, expectedOrigin, expectedRPID }) => {
        expect(expectedChallenge).toMatch(/^reg-challenge-\d+$/);
        expect([expectedOrigin, expectedRPID]).toEqual(['https://legmate.example', 'legmate.example']);
        return verified
            ? { verified: true, registrationInfo: { credential: { id: 'cred-1', publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] }, credentialDeviceType: 'multiDevice', credentialBackedUp: true } }
            : { verified: false };
    },
    verifyAuthenticationResponse: async ({ expectedChallenge, credential }) => {
        expect(expectedChallenge).toMatch(/^login-challenge-\d+$/);
        expect(Array.from(credential.publicKey)).toEqual([1, 2, 3]);
        return { verified, authenticationInfo: { newCounter: 7, credentialBackedUp: true } };
    },
}));

const { hashPassword } = await import('../utils/auth.utils.js');
const { codeOf, encrypt } = await import('../utils/mfa.js');
const PasskeyController = await import('./passkey.controller.js');

// a request with signed cookies, and an answer keeping the cookies it sets, as the browser would
const cookies = {};
const request = (user, body = {}, params = {}) => ({ user, body, params, signedCookies: { ...cookies }, get: (name) => (name === 'user-agent' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' : ''), secure: true });
const answer = () => {
    const res = { statusCode: 200 };
    res.cookie = (name, value) => { cookies[name] = value; return res; };
    res.clearCookie = (name) => { delete cookies[name]; return res; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
};
const account = async () => {
    const user = { _id: { toString: () => 'anna' }, email: 'anna@example.ch', firstname: 'Anna', lastname: 'Muster', passwordHash: await hashPassword('secret123'), passkeys: [], passkeyUserId: null, mfa: { secret: null, enabledAt: null, lastStep: null, recoveryHashes: [] }, save: async () => {} };
    users.push(user);
    return user;
};
const call = async (action, ...args) => { const res = answer(); await PasskeyController[action](request(...args), res); return res; };

beforeEach(() => {
    users.length = 0;
    security.length = 0;
    verified = true;
    Object.keys(cookies).forEach(key => delete cookies[key]);
});

describe('adding a passkey', () => {
    it('asks for the password first', async () => {
        const anna = await account();
        expect((await call('registrationOptions', anna, { password: 'wrong' })).statusCode).toBe(403);
    });

    it('keeps the passkey the browser made, named after the device, and tells the owner', async () => {
        const anna = await account();
        const options = await call('registrationOptions', anna, { password: 'secret123' });
        expect(options.body.rp.id).toBe('legmate.example');
        const added = await call('register', anna, { response: { id: 'cred-1' } });
        expect(added.statusCode).toBe(201);
        expect(added.body.passkeys).toEqual([expect.objectContaining({ id: 'cred-1', name: 'iPhone', synced: true })]);
        expect(anna.passkeys[0]).toMatchObject({ publicKey: 'AQID', transports: ['internal'] });
        expect(security).toEqual(['passkeyAdded']);
    });

    it('asks for the code too when two-step login is on', async () => {
        const anna = await account();
        const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
        anna.mfa = { secret: encrypt(secret), enabledAt: new Date(), lastStep: null, recoveryHashes: [] };
        expect((await call('registrationOptions', anna, { password: 'secret123' })).statusCode).toBe(403);
        expect((await call('registrationOptions', anna, { password: 'secret123', code: '000000' })).statusCode).toBe(403);
        const code = codeOf(secret);
        expect((await call('registrationOptions', anna, { password: 'secret123', code })).statusCode).toBe(200);
        // the code counts once
        expect((await call('registrationOptions', anna, { password: 'secret123', code })).statusCode).toBe(403);
    });

    it('takes the answer once: the same challenge cookie sent again is refused', async () => {
        const anna = await account();
        await call('registrationOptions', anna, { password: 'secret123' });
        const kept = { ...cookies };
        expect((await call('register', anna, { response: {} })).statusCode).toBe(201);
        Object.assign(cookies, kept);
        anna.passkeys = [];
        expect((await call('register', anna, { response: {} })).statusCode).toBe(409);
        expect(anna.passkeys).toHaveLength(0);
    });

    it('refuses an answer without its challenge, or one that does not check out', async () => {
        const anna = await account();
        expect((await call('register', anna, { response: {} })).statusCode).toBe(409);
        await call('registrationOptions', anna, { password: 'secret123' });
        verified = false;
        expect((await call('register', anna, { response: {} })).statusCode).toBe(400);
        expect(anna.passkeys).toHaveLength(0);
    });
});

describe('logging in with a passkey', () => {
    const withPasskey = async () => {
        const anna = await account();
        anna.passkeys.push({ credentialId: 'cred-1', publicKey: 'AQID', counter: 3, transports: ['internal'], name: 'iPhone' });
        return anna;
    };

    it('starts the session of the account the passkey belongs to, without a code', async () => {
        const anna = await withPasskey();
        await call('loginOptions', null);
        const res = await call('login', null, { response: { id: 'cred-1' } });
        expect(res.body).toEqual({ session: 'anna' });
        expect(anna.passkeys[0].counter).toBe(7);
        expect(anna.passkeys[0].lastUsedAt).toBeInstanceOf(Date);
    });

    it('refuses an unknown passkey, a failed check, a late answer and a blocked account', async () => {
        const anna = await withPasskey();
        await call('loginOptions', null);
        expect((await call('login', null, { response: { id: 'nobody' } })).statusCode).toBe(401);
        expect((await call('login', null, { response: { id: 'cred-1' } })).statusCode).toBe(409);
        await call('loginOptions', null);
        verified = false;
        expect((await call('login', null, { response: { id: 'cred-1' } })).statusCode).toBe(401);
        verified = true;
        anna.blockedAt = new Date();
        await call('loginOptions', null);
        expect((await call('login', null, { response: { id: 'cred-1' } })).statusCode).toBe(403);
    });

    it('takes a login answer once: the same challenge cookie sent again is refused', async () => {
        await withPasskey();
        await call('loginOptions', null);
        const kept = { ...cookies };
        expect((await call('login', null, { response: { id: 'cred-1' } })).statusCode).toBe(200);
        Object.assign(cookies, kept);
        expect((await call('login', null, { response: { id: 'cred-1' } })).statusCode).toBe(409);
    });

    it('removes a passkey with the password, which then opens nothing', async () => {
        const anna = await withPasskey();
        expect((await call('remove', anna, {}, { id: 'cred-1' })).statusCode).toBe(403);
        expect((await call('remove', anna, { password: 'wrong' }, { id: 'cred-1' })).statusCode).toBe(403);
        expect(anna.passkeys).toHaveLength(1);
        expect((await call('remove', anna, { password: 'secret123' }, { id: 'cred-1' })).body.passkeys).toEqual([]);
        expect(security).toEqual(['passkeyRemoved']);
        expect((await call('remove', anna, { password: 'secret123' }, { id: 'cred-1' })).statusCode).toBe(404);
    });
});
