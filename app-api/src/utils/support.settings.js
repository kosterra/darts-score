import db from '../models/db.model.js';

/**
 * Supporting Legmate with a gift: the project's own sponsoring page (the same
 * on every installation), and what the global admins of this installation
 * add for it: a TWINT link and a link to any other donation page (Ko-fi,
 * PayPal, their own GitHub Sponsors …). Shown on the page /support, as plain
 * links: no widget or script of another company is loaded.
 */
const KEY = 'support';
export const PROJECT_SPONSORS = 'https://github.com/sponsors/kosterra';
export const SUPPORT_FIELDS = ['url', 'twint'];
export const URL_MAX = 500;

// an address that can be linked to: https only, nothing else
export const cleanUrl = (value) => {
    const text = typeof value === 'string' ? value.trim().slice(0, URL_MAX) : '';
    if (!text) return '';
    try {
        return new URL(text).protocol === 'https:' ? text : '';
    } catch {
        return '';
    }
};

export const getSupportSettings = async () => {
    const value = (await db.setting.findOne({ key: KEY }).lean())?.value ?? {};
    return Object.fromEntries(SUPPORT_FIELDS.map(field => [field, cleanUrl(value[field])]));
};

export const saveSupportSettings = async (raw) => {
    const value = Object.fromEntries(SUPPORT_FIELDS.map(field => [field, cleanUrl(raw?.[field])]));
    await db.setting.updateOne({ key: KEY }, { $set: { value } }, { upsert: true });
    return value;
};

// what the page /support shows: the installation's links, and the project's (once, when they are the same)
export const supportPage = async () => {
    const settings = await getSupportSettings();
    return { ...settings, project: settings.url === PROJECT_SPONSORS ? '' : PROJECT_SPONSORS };
};
