import { describe, it, expect, vi, beforeEach } from 'vitest';

let legal = { email: 'operator@example.ch' };
let mailOn = true;
const sent = [];
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../models/db.model.js', () => ({ default: { user: { findOne: () => ({ lean: async () => ({ language: 'de' }) }) } } }));
vi.mock('./legal.settings.js', () => ({ getLegalSettings: async () => legal }));
vi.mock('./mail.utils.js', () => ({ isMailConfigured: () => mailOn, getAppUrl: () => 'https://oche.example' }));
vi.mock('./mail.service.js', () => ({ sendTemplateMail: async (...args) => { sent.push(args); return true; } }));

const { contactError, sendContactMessage } = await import('./contact.js');
const message = { name: ' Alex ', email: ' alex@example.com ', message: 'We play every Tuesday and love it!' };

beforeEach(() => { sent.length = 0; legal = { email: 'operator@example.ch' }; mailOn = true; });

describe('the contact form', () => {
    it('needs a name, an address to answer to and a message', () => {
        expect(contactError(message)).toBeNull();
        expect(contactError({ ...message, name: ' ' })).toMatch(/name/);
        expect(contactError({ ...message, email: 'alex' })).toMatch(/email address/);
        expect(contactError({ ...message, message: 'Hi' })).toMatch(/10 to 3000/);
        expect(contactError({ ...message, message: 'x'.repeat(3001) })).toMatch(/10 to 3000/);
        expect(contactError()).toMatch(/name/);
    });

    it('mails the operator in their language, answered to the sender', async () => {
        expect(await sendContactMessage(message)).toBe('sent');
        const [id, to, vars, language, { replyTo }] = sent[0];
        expect([id, to, language, replyTo]).toEqual(['contactMessage', 'operator@example.ch', 'de', 'alex@example.com']);
        expect(vars).toMatchObject({ name: 'Alex', email: 'alex@example.com', message: 'We play every Tuesday and love it!' });
    });

    it('is off without the address of the operator or a mail server', async () => {
        legal = { email: '' };
        expect(await sendContactMessage(message)).toBe('off');
        legal = { email: 'operator@example.ch' }; mailOn = false;
        expect(await sendContactMessage(message)).toBe('off');
        expect(sent).toHaveLength(0);
    });

    it('drops what a bot sends, as if sent', async () => {
        expect(await sendContactMessage({ ...message, bot: true })).toBe('sent');
        expect(sent).toHaveLength(0);
    });
});
