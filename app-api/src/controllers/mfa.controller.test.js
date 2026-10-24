import { describe, it, expect, vi, beforeEach } from 'vitest';

// the accounts, the policy and the security mails, in memory
const users = new Map();
let setting = null;
const security = [];
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../utils/notify.js', () => ({ notifySecurity: (user, kind) => { security.push(kind); } }));
vi.mock('../utils/spam.guard.js', () => ({ noteLoginFailure: async () => {} }));
vi.mock('../utils/session.settings.js', () => ({ getSessionTimeoutMs: async () => 5 * 60 * 60 * 1000 }));
vi.mock('../models/db.model.js', () => ({
    default: {
        user: { findById: async (id) => users.get(String(id)) ?? null },
        setting: {
            findOne: () => ({ lean: async () => (setting ? { value: setting } : null) }),
            updateOne: async (query, { $set }) => { setting = $set.value; },
        },
        club: { exists: async () => false },
        session: { updateOne: async () => {} },
        usageDay: { updateOne: async () => {} },
    },
}));
process.env.MFA_KEY = 'test key';

const { finishLogin, loginCode, setup, enable } = await import('./mfa.controller.js');
const { codeOf, encrypt, saveMfaSettings, newRecoveryCodes } = await import('../utils/mfa.js');

// an account as mongoose gives it, enough for the controller
const account = (id, mfa = {}) => {
    const user = {
        _id: { toString: () => id, equals: (other) => String(other) === id }, email: `${id}@example.ch`, role: 'user', sessionVersion: 0,
        mfa: { secret: null, pendingSecret: null, enabledAt: null, lastStep: null, recoveryHashes: [], trustSalt: null, ...mfa },
        save: async () => {},
        toJSON: () => ({ id, email: `${id}@example.ch` }),
    };
    users.set(id, user);
    return user;
};

// a request with its signed cookies, and an answer that keeps what was set
const request = (cookies = {}, body = {}) => ({ signedCookies: cookies, body, get: () => '', secure: false });
const answer = () => {
    const res = { cookies: {}, cleared: [], statusCode: 200 };
    res.cookie = (name, value) => { res.cookies[name] = value; return res; };
    res.clearCookie = (name) => { res.cleared.push(name); return res; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
};

beforeEach(async () => {
    users.clear();
    security.length = 0;
    setting = null;
    await saveMfaSettings({ policy: 'optional', graceDays: 14 });
});

describe('logging in', () => {
    it('starts the session at once without two-step login', async () => {
        const res = answer();
        await finishLogin(request(), res, account('anna'));
        expect(res.cookies.ds_session).toBeDefined();
        expect(res.body.mfa).toMatchObject({ enabled: false });
    });

    it('asks for the code first when it is on, and takes it once', async () => {
        const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
        const anna = account('anna', { secret: encrypt(secret), enabledAt: new Date() });
        const res = answer();
        await finishLogin(request(), res, anna);
        expect(res.body).toEqual({ mfaRequired: true, step: 'code' });
        expect(res.cookies.ds_session).toBeUndefined();

        const pending = res.cookies.ds_mfa;
        const wrong = answer();
        await loginCode(request({ ds_mfa: pending }, { code: '000000' }), wrong);
        expect(wrong.statusCode).toBe(401);

        const right = answer();
        const code = codeOf(secret);
        await loginCode(request({ ds_mfa: pending }, { code, trust: true }), right);
        expect(right.cookies.ds_session).toBeDefined();
        expect(right.cookies.ds_trust).toMatchObject({ uid: 'anna', t: anna.mfa.trustSalt });

        // the same code again does not count
        const again = answer();
        await loginCode(request({ ds_mfa: pending }, { code }), again);
        expect(again.statusCode).toBe(401);

        // a trusted device is not asked
        const trusted = answer();
        await finishLogin(request({ ds_trust: right.cookies.ds_trust }), trusted, anna);
        expect(trusted.cookies.ds_session).toBeDefined();
    });

    it('takes a recovery code once, and tells the owner', async () => {
        const { codes, hashes } = newRecoveryCodes();
        const anna = account('anna', { secret: encrypt('JBSWY3DPEHPK3PXP'), enabledAt: new Date(), recoveryHashes: hashes });
        const res = answer();
        await finishLogin(request(), res, anna);
        const ok = answer();
        await loginCode(request({ ds_mfa: res.cookies.ds_mfa }, { recoveryCode: codes[2] }), ok);
        expect(ok.cookies.ds_session).toBeDefined();
        expect(anna.mfa.recoveryHashes).toHaveLength(9);
        expect(security).toEqual(['mfaRecoveryUsed']);
    });

    it('refuses a pending login of an older session version', async () => {
        const anna = account('anna', { secret: encrypt('JBSWY3DPEHPK3PXP'), enabledAt: new Date() });
        const res = answer();
        await finishLogin(request(), res, anna);
        anna.sessionVersion += 1;
        const late = answer();
        await loginCode(request({ ds_mfa: res.cookies.ds_mfa }, { code: codeOf('JBSWY3DPEHPK3PXP') }), late);
        expect(late.statusCode).toBe(401);
    });
});

describe('required and not set up', () => {
    it('sets it up as part of the login, then starts the session with the recovery codes', async () => {
        await saveMfaSettings({ policy: 'everyone', graceDays: 0 });
        const anna = account('anna');
        const res = answer();
        await finishLogin(request(), res, anna);
        expect(res.body).toEqual({ mfaRequired: true, step: 'enroll' });

        const cookies = { ds_mfa: res.cookies.ds_mfa };
        const started = answer();
        await setup(request(cookies), started);
        expect(started.body.uri).toContain('otpauth://totp/');

        const done = answer();
        await enable(request(cookies, { code: codeOf(started.body.secret) }), done);
        expect(done.cookies.ds_session).toBeDefined();
        expect(done.body.recoveryCodes).toHaveLength(10);
        expect(done.body.mfa).toMatchObject({ enabled: true, required: true });
        expect(security).toEqual(['mfaEnabled']);
    });

    it('lets the login through while there are days left', async () => {
        await saveMfaSettings({ policy: 'everyone', graceDays: 14 });
        const res = answer();
        await finishLogin(request(), res, account('anna'));
        expect(res.cookies.ds_session).toBeDefined();
        expect(res.body.mfa.setupDue).toBeInstanceOf(Date);
    });
});
