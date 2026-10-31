import { describe, it, expect, vi } from 'vitest';

vi.mock('./mail.utils.js', () => ({ getAppUrl: () => 'https://legmate.example' }));

const { relyingParty, setChallenge, takeChallenge } = await import('./passkeys.js');

// a browser keeping the cookies it is given, and one that keeps a copy to send again
const browser = () => {
    const cookies = {};
    const req = { signedCookies: cookies, get: () => '', secure: true };
    const res = { cookie: (name, value) => { cookies[name] = value; }, clearCookie: (name) => { delete cookies[name]; } };
    return { req, res, cookies };
};

describe('the relying party', () => {
    it('is the address of the installation, not the one the browser called', () => {
        expect(relyingParty({ get: () => 'https://evil.example' })).toEqual({ id: 'legmate.example', origin: 'https://legmate.example', name: 'Legmate' });
    });
});

describe('the challenge', () => {
    it('is taken once, also when the cookie is sent again', () => {
        const { req, res, cookies } = browser();
        setChallenge(req, res, 'login', 'challenge-1');
        const kept = { ...cookies };
        expect(takeChallenge(req, res, 'login')).toMatchObject({ challenge: 'challenge-1', purpose: 'login' });
        // the cookie is cleared with the answer …
        expect(cookies.ds_pk).toBeUndefined();
        // … but a browser that keeps it gets nothing a second time
        Object.assign(cookies, kept);
        expect(takeChallenge(req, res, 'login')).toBeNull();
    });

    it('is for its purpose only, and not after its time', () => {
        const { req, res, cookies } = browser();
        setChallenge(req, res, 'register', 'challenge-2', 'anna');
        expect(takeChallenge(req, res, 'login')).toBeNull();
        setChallenge(req, res, 'register', 'challenge-3', 'anna');
        cookies.ds_pk.exp = Date.now() - 1;
        expect(takeChallenge(req, res, 'register')).toBeNull();
        setChallenge(req, res, 'register', 'challenge-4', 'anna');
        expect(takeChallenge(req, res, 'register')).toMatchObject({ challenge: 'challenge-4', uid: 'anna' });
    });
});
