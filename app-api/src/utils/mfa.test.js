import { describe, it, expect, vi, beforeEach } from 'vitest';

// the setting of the policy and the clubs, in memory
let setting = null;
let adminOf = new Set();
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({
    default: {
        setting: {
            findOne: () => ({ lean: async () => (setting ? { value: setting } : null) }),
            updateOne: async (query, { $set }) => { setting = $set.value; },
        },
        club: { exists: async ({ admins }) => adminOf.has(String(admins)) },
    },
}));
process.env.MFA_KEY = 'test key';

const {
    checkCode, codeOf, decrypt, encrypt, newRecoveryCodes, newSecret, recoveryIndex, otpauthUri,
    saveMfaSettings, getMfaSettings, mfaStateOf, tooManyTries, noteWrongCode, clearTries, CODE_TRIES,
} = await import('./mfa.js');

const NOW = Date.UTC(2026, 9, 24, 12, 0, 10);
const DAY = 24 * 60 * 60 * 1000;

describe('the secret', () => {
    it('is kept encrypted and comes back as it was', () => {
        const secret = newSecret();
        const stored = encrypt(secret);
        expect(stored).not.toContain(secret);
        expect(decrypt(stored)).toBe(secret);
        // a changed one is refused
        expect(decrypt(`${stored.slice(0, -2)}xx`)).toBeNull();
        expect(decrypt('nonsense')).toBeNull();
    });

    it('goes to the authenticator app as an otpauth address', () => {
        expect(otpauthUri('anna@example.ch', 'ABC')).toBe('otpauth://totp/Oche:anna%40example.ch?secret=ABC&period=30&digits=6&algorithm=SHA1&issuer=Oche');
    });
});

describe('the codes', () => {
    const secret = newSecret();

    it('take the code of now and of the step before or after', () => {
        expect(checkCode(secret, codeOf(secret, NOW), null, NOW)).toBe(Math.floor(NOW / 30000));
        expect(checkCode(secret, codeOf(secret, NOW - 30000), null, NOW)).toBe(Math.floor(NOW / 30000) - 1);
        expect(checkCode(secret, codeOf(secret, NOW + 30000), null, NOW)).toBe(Math.floor(NOW / 30000) + 1);
        expect(checkCode(secret, codeOf(secret, NOW - 90000), null, NOW)).toBeNull();
    });

    it('take a code once only', () => {
        const step = checkCode(secret, codeOf(secret, NOW), null, NOW);
        expect(checkCode(secret, codeOf(secret, NOW), step, NOW)).toBeNull();
        // nor an older one
        expect(checkCode(secret, codeOf(secret, NOW - 30000), step, NOW)).toBeNull();
    });

    it('refuse what is no code', () => {
        expect(checkCode(secret, '12345', null, NOW)).toBeNull();
        expect(checkCode(secret, 'abcdef', null, NOW)).toBeNull();
        expect(checkCode(null, '123456', null, NOW)).toBeNull();
        // spaces from copying are fine
        const code = codeOf(secret, NOW);
        expect(checkCode(secret, `${code.slice(0, 3)} ${code.slice(3)}`, null, NOW)).not.toBeNull();
    });
});

describe('the recovery codes', () => {
    it('are ten, kept as hashes, found however they are typed', () => {
        const { codes, hashes } = newRecoveryCodes();
        expect(codes).toHaveLength(10);
        expect(new Set(codes).size).toBe(10);
        expect(codes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
        expect(hashes.join()).not.toContain(codes[0]);
        expect(recoveryIndex(hashes, codes[4])).toBe(4);
        expect(recoveryIndex(hashes, codes[4].toUpperCase().replace('-', ' '))).toBe(4);
        expect(recoveryIndex(hashes, 'aaaa-aaaa')).toBe(-1);
    });
});

describe('wrong codes', () => {
    it('make the account wait after five', () => {
        clearTries('u1');
        for (let i = 0; i < CODE_TRIES.limit - 1; i += 1) noteWrongCode('u1', NOW);
        expect(tooManyTries('u1', NOW)).toBe(false);
        noteWrongCode('u1', NOW);
        expect(tooManyTries('u1', NOW)).toBe(true);
        expect(tooManyTries('u1', NOW + CODE_TRIES.windowMs)).toBe(false);
    });
});

describe('the policy', () => {
    const anna = { _id: 'anna', role: 'user', mfa: {} };
    const admin = { _id: 'ida', role: 'user', mfa: {} };
    const on = { _id: 'on', role: 'globalAdmin', mfa: { secret: 'x', enabledAt: new Date(), recoveryHashes: ['a', 'b'] } };

    beforeEach(async () => {
        setting = null;
        adminOf = new Set(['ida']);
        await saveMfaSettings({ policy: 'optional', graceDays: 14 });
    });

    it('is optional by default, and nobody has to set it up', async () => {
        setting = null;
        expect(await getMfaSettings()).toMatchObject({ policy: 'optional', graceDays: 14, requiredSince: null });
        expect(await mfaStateOf(anna)).toMatchObject({ enabled: false, required: false, setupDue: null, mustSetUp: false });
        expect(await mfaStateOf(on)).toMatchObject({ enabled: true, recoveryLeft: 2 });
    });

    it('required for the admins: the club admins and global admins, with days to set it up', async () => {
        const settings = await saveMfaSettings({ policy: 'admins', graceDays: 14 });
        expect(settings.requiredSince).toBeInstanceOf(Date);
        expect(await mfaStateOf(anna)).toMatchObject({ required: false, mustSetUp: false });
        const state = await mfaStateOf(admin);
        expect(state).toMatchObject({ required: true, mustSetUp: false });
        expect(state.setupDue.getTime() - settings.requiredSince.getTime()).toBe(14 * DAY);
        expect(await mfaStateOf(on)).toMatchObject({ required: true, setupDue: null, mustSetUp: false });
    });

    it('without days to set it up, at the next login', async () => {
        await saveMfaSettings({ policy: 'everyone', graceDays: 0 });
        expect(await mfaStateOf(anna)).toMatchObject({ required: true, setupDue: null, mustSetUp: true });
    });

    it('keeps when it became required, and forgets it when it is no longer', async () => {
        const first = await saveMfaSettings({ policy: 'admins', graceDays: 14 });
        const second = await saveMfaSettings({ policy: 'everyone', graceDays: 7 });
        expect(second.requiredSince).toEqual(first.requiredSince);
        expect((await saveMfaSettings({ policy: 'optional', graceDays: 7 })).requiredSince).toBeNull();
    });
});
