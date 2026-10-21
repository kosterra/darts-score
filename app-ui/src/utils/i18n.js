/**
 * The languages of the app. The English text is the key: t('Start game')
 * looks it up in the dictionary of the language and falls back to the
 * English text, so nothing is ever missing. {{name}} placeholders are filled
 * from the values given. The language is chosen once when the app starts
 * (saved choice, then the account, then the browser); changing it reloads
 * the app, so everything, also texts set up when the app starts, follows.
 */

export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'es', label: 'Español' },
];
const CODES = LANGUAGES.map(language => language.code);
const STORAGE_KEY = 'darts-score.language';

let language = 'en';
let dictionary = {};

const fill = (text, values) => (values
    ? text.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name) => (name in values && values[name] !== undefined && values[name] !== null ? String(values[name]) : all))
    : text);

/**
 * The text in the language of the app, with its placeholders filled.
 */
export const t = (text, values) => {
    if (typeof text !== 'string') return text;
    return fill(dictionary[text] ?? text, values);
};

/**
 * One of two texts by a count: t('{{count}} game') or t('{{count}} games').
 */
export const tn = (count, one, other, values) => t(count === 1 ? one : other, { count, ...values });

export const currentLanguage = () => language;

// the browser's language, if the app has it
const browserLanguage = () => {
    for (const candidate of navigator.languages ?? [navigator.language]) {
        const code = String(candidate ?? '').slice(0, 2).toLowerCase();
        if (CODES.includes(code)) return code;
    }
    return 'en';
};

const storedLanguage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return CODES.includes(stored) ? stored : null;
    } catch {
        return null;
    }
};

const LOADERS = {
    de: () => import('../locales/de.json'),
    fr: () => import('../locales/fr.json'),
    it: () => import('../locales/it.json'),
    es: () => import('../locales/es.json'),
};

/**
 * Picks the language and loads its texts; the app starts after this.
 */
export const initLanguage = async () => {
    language = storedLanguage() ?? browserLanguage();
    document.documentElement.lang = language;
    if (language !== 'en') {
        try {
            dictionary = (await LOADERS[language]()).default ?? {};
        } catch {
            language = 'en';
            dictionary = {};
        }
    }
    return language;
};

/**
 * Changes the language: saved on this device, and the app starts again in it.
 * reload: false only saves it (the app is reloaded elsewhere).
 */
export const setLanguage = (code, { reload = true } = {}) => {
    if (!CODES.includes(code)) return;
    try {
        localStorage.setItem(STORAGE_KEY, code);
    } catch {
        // without storage the choice lasts until the app is closed
    }
    if (reload && code !== language) window.location.reload();
};

// for formatting numbers and dates the way the language does it
export const locale = () => ({ en: 'en-GB', de: 'de-CH', fr: 'fr-CH', it: 'it-CH', es: 'es-ES' })[language] ?? 'en-GB';
