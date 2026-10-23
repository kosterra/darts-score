import { describe, it, expect } from 'vitest';
import { MAIL_LANGUAGES, MAIL_TEMPLATES, defaultsOf, effectiveTemplate, renderMail, sampleVars, templateError, validityOf } from './mail.templates.js';

describe('mail templates', () => {
    it('fills the placeholders in the subject, the text and the button', () => {
        const mail = renderMail(effectiveTemplate('adminInvited'), { firstname: 'Anna', club: 'Red Lion', inviter: 'Alex', validity: '7 days', link: 'https://x/l?t=1', appUrl: 'https://x' });
        expect(mail.subject).toBe('You are invited to run Red Lion on Oche');
        expect(mail.text).toContain('Hello Anna,');
        expect(mail.text).toContain('Choose your password: https://x/l?t=1');
        expect(mail.text).toContain('This email was sent by Oche (https://x).');
        expect(mail.html).toContain('href="https://x/l?t=1"');
        expect(mail.html).toContain('>Choose your password</a>');
        expect(mail.html).not.toContain('{{');
    });

    it('escapes what is filled in, so a name cannot add HTML', () => {
        const mail = renderMail({ subject: 'Hi', body: 'Hello {{firstname}}', button: 'Go' }, { firstname: '<b>Eve</b>', link: 'https://x/"><script>' });
        expect(mail.html).toContain('Hello &lt;b&gt;Eve&lt;/b&gt;');
        expect(mail.html).not.toContain('<script>');
        expect(mail.text).toContain('Hello <b>Eve</b>');
    });

    it('takes what the global admins changed, the defaults otherwise', () => {
        expect(effectiveTemplate('passwordReset', { passwordReset: { subject: 'New password' } })).toMatchObject({ subject: 'New password', button: 'Choose a new password' });
        expect(effectiveTemplate('nothing')).toBeNull();
    });

    it('refuses empty fields and placeholders the mail does not know', () => {
        const ok = { subject: 'Hi {{firstname}}', body: 'Welcome to {{club}} as {{nickname}}', button: 'Open' };
        expect(templateError('playerAdded', ok)).toBeNull();
        expect(templateError('passwordReset', ok)).toBe('{{club}} is no placeholder of this mail.');
        expect(templateError('playerAdded', { ...ok, body: ' ' })).toBe('The body is empty.');
        expect(templateError('playerAdded', { ...ok, subject: 'x'.repeat(151) })).toMatch(/longer than 150/);
        expect(templateError('unknown', ok)).toBe('There is no such mail.');
    });

    it('has defaults that only use their own placeholders, and samples for all of them', () => {
        for (const template of MAIL_TEMPLATES) {
            expect(templateError(template.id, template)).toBeNull();
            expect(renderMail(template, sampleVars(template.id)).html).not.toContain('{{');
        }
    });

    it('has its defaults in every language, with the placeholders of the English text', () => {
        for (const language of MAIL_LANGUAGES) {
            for (const template of MAIL_TEMPLATES) {
                const defaults = defaultsOf(template.id, language);
                expect(templateError(template.id, defaults), `${language} ${template.id}`).toBeNull();
                const placeholders = (text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(match => match[1]).sort();
                expect(placeholders(`${defaults.subject} ${defaults.body} ${defaults.button}`)).toEqual(placeholders(`${template.subject} ${template.body} ${template.button}`));
                if (language === 'de') expect(`${defaults.subject}${defaults.body}${defaults.button}`).not.toContain('ß');
            }
        }
    });

    it('writes a mail in the language of its reader, layout and validity too', () => {
        const mail = renderMail(effectiveTemplate('passwordReset', {}, 'de'), { firstname: 'Anna', validity: validityOf(1, 'de'), link: 'https://x/r', appUrl: 'https://x' }, 'de');
        expect(mail.subject).toBe('Setze dein Oche-Passwort zurück');
        expect(mail.text).toContain('läuft in 1 Stunde ab');
        expect(mail.text).toContain('Diese E-Mail wurde von Oche (https://x) gesendet.');
        expect(mail.html).toContain('<html lang="de">');
        expect(mail.html).toContain('Falls der Knopf nicht funktioniert');
        expect(validityOf(7 * 24, 'fr')).toBe('7 jours');
        expect(validityOf(7 * 24)).toBe('7 days');
    });

    it('keeps what the global admins changed per language', () => {
        const overrides = { passwordReset: { subject: 'New password' }, 'passwordReset:it': { subject: 'Nuova password' } };
        expect(effectiveTemplate('passwordReset', overrides).subject).toBe('New password');
        expect(effectiveTemplate('passwordReset', overrides, 'it').subject).toBe('Nuova password');
        expect(effectiveTemplate('passwordReset', overrides, 'fr').subject).toBe('Réinitialise ton mot de passe Oche');
    });
});
