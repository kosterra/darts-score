import { afterEach, describe, expect, it, vi } from 'vitest';
import { explainMailError, mailSetup } from './mail.utils.js';
import { renderMail } from './mail.templates.js';
import { TEST_MAIL } from './mail.languages.js';
import { MAIL_LANGUAGES } from './mail.templates.js';

afterEach(() => vi.unstubAllEnvs());

describe('the mail setup', () => {
    it('shows the server, port, encryption, login and sender, never the password', () => {
        vi.stubEnv('SMTP_HOST', 'smtp.example.com');
        vi.stubEnv('SMTP_PORT', '465');
        vi.stubEnv('SMTP_SECURE', '');
        vi.stubEnv('SMTP_USER', 'oche@example.com');
        vi.stubEnv('SMTP_PASSWORD', 'secret');
        vi.stubEnv('SMTP_FROM', 'Legmate <oche@example.com>');
        vi.stubEnv('APP_URL', 'https://oche.example.com/');
        const setup = mailSetup();
        expect(setup).toEqual({
            configured: true, host: 'smtp.example.com', port: 465, encryption: 'tls', user: 'oche@example.com',
            password: true, from: 'Legmate <oche@example.com>', appUrl: 'https://oche.example.com', missing: [],
        });
        expect(JSON.stringify(setup)).not.toContain('secret');
    });

    it('names what is missing, with STARTTLS on port 587 by default', () => {
        vi.stubEnv('SMTP_HOST', '');
        vi.stubEnv('SMTP_PORT', '');
        vi.stubEnv('SMTP_SECURE', '');
        vi.stubEnv('APP_URL', '');
        vi.stubEnv('UI_URL', '');
        expect(mailSetup()).toMatchObject({ configured: false, host: null, port: 587, encryption: 'starttls', missing: ['SMTP_HOST', 'APP_URL'] });
    });
});

describe('a failed mail', () => {
    const reason = (err) => explainMailError(err).message;

    it('points to the setting to check', () => {
        expect(reason({ code: 'EAUTH', response: '535 5.7.8 Authentication failed' })).toMatch(/SMTP_USER and SMTP_PASSWORD/);
        expect(reason({ code: 'EDNS', message: 'getaddrinfo ENOTFOUND smtp.nowhere' })).toMatch(/Check SMTP_HOST\.$/);
        expect(reason({ code: 'ESOCKET', message: 'self-signed certificate in certificate chain' })).toMatch(/certificate/);
        expect(reason({ code: 'ESOCKET', message: 'ssl3_get_record:wrong version number' })).toMatch(/SMTP_SECURE/);
        expect(reason({ code: 'ETIMEDOUT', message: 'Connection timeout' })).toMatch(/did not answer in time/);
        expect(reason({ code: 'ESOCKET', message: 'connect ECONNREFUSED 10.0.0.1:587' })).toMatch(/could not be reached/);
        expect(reason({ code: 'EENVELOPE', responseCode: 553, response: '553 Sender address rejected' })).toMatch(/SMTP_FROM/);
        expect(reason(new Error('something else'))).toMatch(/could not be sent/);
    });

    it('keeps the answer of the server as the detail', () => {
        expect(explainMailError({ code: 'EAUTH', response: '535 5.7.8 Authentication failed' })).toEqual({
            message: 'The mail server refused the login. Check SMTP_USER and SMTP_PASSWORD.', code: 'EAUTH', detail: '535 5.7.8 Authentication failed',
        });
    });
});

describe('the test mail', () => {
    it('is there in every language, with no placeholder left', () => {
        for (const language of MAIL_LANGUAGES) {
            const mail = renderMail(TEST_MAIL[language], { firstname: 'Anna', date: '24 Oct 2026, 20:15', server: 'smtp.example.com:587', link: 'https://x', appUrl: 'https://x' }, language);
            expect(mail.subject).toContain('Legmate');
            expect(mail.text).toContain('smtp.example.com:587');
            expect(mail.html).not.toContain('{{');
        }
    });
});
