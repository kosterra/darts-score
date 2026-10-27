import db from '../models/db.model.js';
import { getSessionSettings } from './session.settings.js';
import { QUICK_KEEP_DAYS, QUICK_UNFINISHED_DAYS } from './quick.games.js';
import { LOG_RETENTION_DAYS } from '../models/log.entry.model.js';
import { USAGE_KEEP_DAYS } from '../models/usage.day.model.js';
import { isMailConfigured } from './mail.utils.js';
import { LANGUAGES } from '../models/user.model.js';

/**
 * Who runs the installation, for its privacy policy and imprint: set by the
 * global admins (one setting, "legal"), as every installation of Legmate has an
 * operator of its own. The notes for the privacy page are in each language
 * ({ en, de, … }); a language left empty shows the English ones.
 */
const KEY = 'legal';
export const LEGAL_LIMITS = { operator: 200, address: 500, email: 254, notes: 2000 };

const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
// the notes in every language; notes saved before as one text are the English ones
const cleanNotes = (value) => {
    const given = typeof value === 'string' ? { en: value } : (value && typeof value === 'object' ? value : {});
    return Object.fromEntries(LANGUAGES.map(language => [language, clean(given[language], LEGAL_LIMITS.notes)]));
};
const settingsOf = (value = {}) => ({
    ...Object.fromEntries(Object.entries(LEGAL_LIMITS).map(([field, max]) => [field, clean(value[field], max)])),
    notes: cleanNotes(value.notes),
});

export const getLegalSettings = async () => settingsOf((await db.setting.findOne({ key: KEY }).lean())?.value);

export const saveLegalSettings = async (raw) => {
    const value = settingsOf(raw);
    await db.setting.updateOne({ key: KEY }, { $set: { value } }, { upsert: true });
    return value;
};

// the notes for a reader: in their language, else the English ones, else any there are
export const notesIn = (notes, language) => notes[language] || notes.en || Object.values(notes).find(Boolean) || '';

/**
 * What the privacy page shows: the operator, and how long things are kept on
 * this installation, so the text says what really happens.
 */
export const legalPage = async (language = 'en') => {
    const legal = await getLegalSettings();
    return {
    ...legal,
    notes: notesIn(legal.notes, language),
    mailEnabled: isMailConfigured(),
    // the contact form sends to the operator's address, so it needs both
    contactForm: Boolean(legal.email && isMailConfigured()),
    keep: {
        sessionHours: (await getSessionSettings()).timeoutHours,
        trustedDeviceDays: 30,
        quickGameDays: QUICK_KEEP_DAYS,
        quickUnfinishedDays: QUICK_UNFINISHED_DAYS,
        notificationDays: 365,
        fairPlayDays: 31,
        errorLogDays: LOG_RETENTION_DAYS,
        claimLinkDays: 30,
        usageDays: USAGE_KEEP_DAYS,
    },
    };
};
