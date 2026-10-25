import db from '../models/db.model.js';
import { getSessionSettings } from './session.settings.js';
import { QUICK_KEEP_DAYS } from './quick.games.js';
import { LOG_RETENTION_DAYS } from '../models/log.entry.model.js';
import { USAGE_KEEP_DAYS } from '../models/usage.day.model.js';
import { isMailConfigured } from './mail.utils.js';

/**
 * Who runs the installation, for its privacy policy and imprint: set by the
 * global admins (one setting, "legal"), as every installation of Oche has an
 * operator of its own.
 */
const KEY = 'legal';
export const LEGAL_LIMITS = { operator: 200, address: 500, email: 254, notes: 2000 };

const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export const getLegalSettings = async () => {
    const value = (await db.setting.findOne({ key: KEY }).lean())?.value ?? {};
    return Object.fromEntries(Object.entries(LEGAL_LIMITS).map(([field, max]) => [field, clean(value[field], max)]));
};

export const saveLegalSettings = async (raw) => {
    const value = Object.fromEntries(Object.entries(LEGAL_LIMITS).map(([field, max]) => [field, clean(raw?.[field], max)]));
    await db.setting.updateOne({ key: KEY }, { $set: { value } }, { upsert: true });
    return value;
};

/**
 * What the privacy page shows: the operator, and how long things are kept on
 * this installation, so the text says what really happens.
 */
export const legalPage = async () => {
    const legal = await getLegalSettings();
    return {
    ...legal,
    mailEnabled: isMailConfigured(),
    // the contact form sends to the operator's address, so it needs both
    contactForm: Boolean(legal.email && isMailConfigured()),
    keep: {
        sessionHours: (await getSessionSettings()).timeoutHours,
        trustedDeviceDays: 30,
        quickGameDays: QUICK_KEEP_DAYS,
        notificationDays: 365,
        fairPlayDays: 31,
        errorLogDays: LOG_RETENTION_DAYS,
        claimLinkDays: 30,
        usageDays: USAGE_KEEP_DAYS,
    },
    };
};
