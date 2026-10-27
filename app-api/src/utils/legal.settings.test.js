import { describe, it, expect, vi } from 'vitest';

let stored = null;
vi.mock('../models/db.model.js', () => ({ default: { setting: {
    findOne: () => ({ lean: async () => (stored ? { value: stored } : null) }),
    updateOne: async (query, { $set }) => { stored = $set.value; },
} } }));
vi.mock('../models/user.model.js', () => ({ LANGUAGES: ['en', 'de', 'fr', 'it', 'es'] }));
vi.mock('./session.settings.js', () => ({ getSessionSettings: async () => ({ timeoutHours: 5 }) }));
vi.mock('./quick.games.js', () => ({ QUICK_KEEP_DAYS: 30, QUICK_UNFINISHED_DAYS: 3 }));
vi.mock('../models/log.entry.model.js', () => ({ LOG_RETENTION_DAYS: 30 }));
vi.mock('../models/usage.day.model.js', () => ({ USAGE_KEEP_DAYS: 400 }));
vi.mock('./mail.utils.js', () => ({ isMailConfigured: () => true }));

const { getLegalSettings, saveLegalSettings, legalPage, notesIn } = await import('./legal.settings.js');

describe('the notes for the privacy page', () => {
    it('are kept in each language', async () => {
        const saved = await saveLegalSettings({ operator: ' Legmate.ch ', notes: { en: ' Hosted in Zurich ', de: 'Gehostet in Zürich', xx: 'no' } });
        expect(saved.operator).toBe('Legmate.ch');
        expect(saved.notes).toEqual({ en: 'Hosted in Zurich', de: 'Gehostet in Zürich', fr: '', it: '', es: '' });
    });

    it('show the reader\'s language, else the English ones, else any', () => {
        const notes = { en: 'English', de: 'Deutsch', fr: '', it: '', es: '' };
        expect(notesIn(notes, 'de')).toBe('Deutsch');
        expect(notesIn(notes, 'fr')).toBe('English');
        expect(notesIn({ en: '', de: '', fr: 'Français', it: '', es: '' }, 'it')).toBe('Français');
        expect(notesIn({ en: '', de: '', fr: '', it: '', es: '' }, 'en')).toBe('');
    });

    it('saved before as one text are the English ones', async () => {
        stored = { operator: 'Club', notes: 'Through Cloudflare' };
        expect((await getLegalSettings()).notes.en).toBe('Through Cloudflare');
        expect((await legalPage('es')).notes).toBe('Through Cloudflare');
    });
});
