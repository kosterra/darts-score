import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

// the app reads these at import; set them before importing it
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
// no mail server here; the breached-password check is not what these tests are about
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * Drives the real Express app against an in-memory MongoDB, to guard what a
 * device left logged in (or a stolen session cookie) must not be able to do
 * alone: change the email address, add or remove a passkey; and that a new
 * password forgets the trusted devices of two-step login, while a blocked
 * account gets no new password and no session by the reset link.
 */

let mongod;
let db;
let app;
let mfa;
const api = () => supertest(app);
const PASSWORD = 'Passw0rd!';
const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

// the cookies of a response, as a browser would send them back (the cleared ones gone)
const jar = (...responses) => {
    const cookies = new Map();
    for (const res of responses) {
        for (const line of res.headers['set-cookie'] ?? []) {
            const [pair, ...attributes] = line.split(';');
            const [name, value] = pair.split('=');
            if (attributes.some(attr => /^\s*(Max-Age=0|Expires=Thu, 01 Jan 1970)/i.test(attr))) cookies.delete(name);
            else cookies.set(name, value);
        }
    }
    return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
};
const as = (cookie) => ({
    get: (path) => api().get(path).set('Cookie', cookie),
    post: (path, body) => api().post(path).set('Cookie', cookie).send(body ?? {}),
    put: (path, body) => api().put(path).set('Cookie', cookie).send(body ?? {}),
    del: (path, body) => api().delete(path).set('Cookie', cookie).send(body ?? {}),
});
const login = (email, cookie = '') => api().post('/api/auth/login').set('Cookie', cookie).send({ email, password: PASSWORD });

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    mfa = await import('../../src/utils/mfa.js');
    const { hashPassword } = await import('../../src/utils/auth.utils.js');
    const passwordHash = await hashPassword(PASSWORD);
    await db.user.create({ email: 'plain@test.local', firstname: 'Pia', lastname: 'Plain', passwordHash });
    const { codes, hashes } = mfa.newRecoveryCodes();
    recoveryCodes.push(...codes);
    await db.user.create({
        email: 'two@test.local', firstname: 'Tom', lastname: 'Twostep', passwordHash,
        mfa: { secret: mfa.encrypt(SECRET), enabledAt: new Date(), recoveryHashes: hashes, trustSalt: 'salt-of-tom' },
    });
    await db.user.create({ email: 'blocked@test.local', firstname: 'Bob', lastname: 'Blocked', passwordHash, blockedAt: new Date(), resetTokenHash: null });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

// Tom's second factor: a code of the app counts once per 30 s step, so the tests
// mostly use his recovery codes, each once (ten of them)
const recoveryCodes = [];
const nextCode = async () => recoveryCodes.shift();
// Tom's session: the password, then the code
const loginTom = async (second = {}) => {
    const first = await login('two@test.local');
    expect(first.body).toMatchObject({ mfaRequired: true, step: 'code' });
    const code = await api().post('/api/auth/login/mfa').set('Cookie', jar(first)).send({ recoveryCode: await nextCode(), trust: true, ...second });
    expect(code.status).toBe(200);
    return jar(first, code);
};

describe('changing the email address', () => {
    const profile = (email) => ({ email, firstname: 'Pia', lastname: 'Plain' });

    it('needs the current password; the name alone does not', async () => {
        const pia = jar(await login('plain@test.local'));
        expect((await as(pia).put('/api/auth/me', { ...profile('plain@test.local'), firstname: 'Mia' })).status).toBe(200);
        const noPassword = await as(pia).put('/api/auth/me', profile('new@test.local'));
        expect(noPassword.status).toBe(403);
        expect(noPassword.body.message).toMatch(/current password/);
        expect((await as(pia).put('/api/auth/me', { ...profile('new@test.local'), currentPassword: 'wrong' })).status).toBe(403);
        expect((await db.user.findOne({ email: 'plain@test.local' }).lean())?.email).toBe('plain@test.local');
        const ok = await as(pia).put('/api/auth/me', { ...profile('new@test.local'), currentPassword: PASSWORD });
        expect(ok.status).toBe(200);
        expect(ok.body.email).toBe('new@test.local');
        // and back, for the tests below
        expect((await as(pia).put('/api/auth/me', { ...profile('plain@test.local'), currentPassword: PASSWORD })).status).toBe(200);
    });

    it('needs the code too when two-step login is on', async () => {
        const tom = await loginTom();
        const body = { email: 'tom-new@test.local', firstname: 'Tom', lastname: 'Twostep', currentPassword: PASSWORD };
        const noCode = await as(tom).put('/api/auth/me', body);
        expect(noCode.status).toBe(403);
        expect(noCode.body.message).toMatch(/code/);
        expect((await as(tom).put('/api/auth/me', { ...body, code: '000000' })).status).toBe(403);
        // a code of the app, once
        const code = mfa.codeOf(SECRET);
        expect((await as(tom).put('/api/auth/me', { ...body, code })).status).toBe(200);
        expect((await as(tom).put('/api/auth/me', { ...body, email: 'two@test.local', code })).status).toBe(403);
        expect((await as(tom).put('/api/auth/me', { ...body, email: 'two@test.local', code: await nextCode() })).status).toBe(200);
    });
});

describe('passkeys', () => {
    it('are added with the password and the code, and removed with the password', async () => {
        process.env.APP_URL = 'https://legmate.example';
        const tom = await loginTom();
        expect((await as(tom).post('/api/auth/passkeys/options', { password: PASSWORD })).status).toBe(403);
        expect((await as(tom).post('/api/auth/passkeys/options', { password: 'wrong', code: await nextCode() })).status).toBe(403);
        const options = await as(tom).post('/api/auth/passkeys/options', { password: PASSWORD, code: await nextCode() });
        expect(options.status).toBe(200);
        expect(options.body.rp).toEqual({ name: 'Legmate', id: 'legmate.example' });
        // removing one: the password, then the passkey (there is none)
        expect((await as(tom).del('/api/auth/passkeys/some-id')).status).toBe(422);
        expect((await as(tom).del('/api/auth/passkeys/some-id', { password: 'wrong' })).status).toBe(403);
        expect((await as(tom).del('/api/auth/passkeys/some-id', { password: PASSWORD })).status).toBe(404);
    });
});

describe('a new password', () => {
    it('forgets the trusted devices: the code is asked again', async () => {
        const tom = await loginTom();
        // trusted: the password alone logs in
        expect((await login('two@test.local', tom)).status).toBe(200);
        const before = (await db.user.findOne({ email: 'two@test.local' }).lean()).mfa.trustSalt;
        expect((await as(tom).put('/api/auth/password', { currentPassword: PASSWORD, newPassword: 'Passw0rd!2' })).status).toBe(200);
        const after = (await db.user.findOne({ email: 'two@test.local' }).lean()).mfa.trustSalt;
        expect(after).not.toBe(before);
        const again = await api().post('/api/auth/login').set('Cookie', tom).send({ email: 'two@test.local', password: 'Passw0rd!2' });
        expect(again.body).toMatchObject({ mfaRequired: true, step: 'code' });
        // back to the password of the other tests
        await db.user.updateOne({ email: 'two@test.local' }, { $set: { passwordHash: (await db.user.findOne({ email: 'plain@test.local' }).lean()).passwordHash } });
    });
});

describe('a blocked account', () => {
    it('gets no reset link and no session by one it has', async () => {
        const { issuePasswordLink } = await import('../../src/utils/auth.tokens.js');
        const bob = await db.user.findOne({ email: 'blocked@test.local' });
        const link = issuePasswordLink(bob, 1);
        await bob.save();
        const token = new URL(link, 'https://legmate.example').searchParams.get('token');

        const asked = await api().post('/api/auth/forgot-password').send({ email: 'blocked@test.local' });
        // the same answer as for anyone, but no new link
        expect([200, 503]).toContain(asked.status);
        expect((await db.user.findOne({ email: 'blocked@test.local' }).lean()).resetTokenHash).toBe(bob.resetTokenHash);

        const reset = await api().post('/api/auth/reset-password').send({ token, password: 'Another1Password' });
        expect(reset.status).toBe(403);
        expect(reset.body.blocked).toBe(true);
        expect(reset.headers['set-cookie'] ?? []).toEqual([]);
        expect((await db.user.findOne({ email: 'blocked@test.local' }).lean()).passwordHash).toBe(bob.passwordHash);
    });
});
