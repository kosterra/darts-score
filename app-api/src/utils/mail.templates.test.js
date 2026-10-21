import { describe, it, expect } from 'vitest';
import { MAIL_TEMPLATES, effectiveTemplate, renderMail, sampleVars, templateError } from './mail.templates.js';

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
});
