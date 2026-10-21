/**
 * The languages of the app. The English text is the key: t('Start game')
 * looks it up in the dictionary of the language and falls back to the
 * English text, so nothing is ever missing. {{name}} placeholders are filled
 * from the values given. The language is chosen once when the app starts
 * (saved choice, then the account, then the browser); changing it reloads
 * the app, so everything, also texts set up when the app starts, follows.
 */

import SERVER_TEXTS from '../locales/server.json';

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
// the texts of the server as patterns ("Throw {{n}} 180s"), matched against what it sends
let patterns = null;
const translated = new Map();

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

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the keys with placeholders as regular expressions, the longest first so the most specific one wins
const compilePatterns = () => SERVER_TEXTS
    // with some words of their own, so a pattern never takes a name apart
    .filter(key => key.includes('{{') && dictionary[key] !== undefined && key.replace(/\{\{\s*\w+\s*\}\}/g, '').replace(/[^\p{L}]/gu, '').length >= 4)
    .sort((a, b) => b.replace(/\{\{\s*\w+\s*\}\}/g, '').length - a.replace(/\{\{\s*\w+\s*\}\}/g, '').length)
    .map(key => {
        const names = [];
        const source = key.split(/(\{\{\s*\w+\s*\}\})/).map(part => {
            const placeholder = part.match(/^\{\{\s*(\w+)\s*\}\}$/);
            if (!placeholder) return escape(part);
            names.push(placeholder[1]);
            return '(.*?)';
        }).join('');
        return { key, names, regex: new RegExp(`^${source}$`, 's') };
    });

const SERVER = new Set(SERVER_TEXTS);
const translateValue = (value, depth) => (SERVER.has(value) || patterns.some(({ regex }) => regex.test(value)) ? translateText(value, depth) : value);

/**
 * A text the server sent, in the language of the app: the dictionary has it
 * as it is, or as a pattern whose values are translated in turn ("Win 10
 * games in a row" from "Win {{n}} games in a row"). Unknown texts stay as
 * they are, e.g. names.
 */
export const translateText = (text, depth = 0) => {
    if (language === 'en' || typeof text !== 'string' || !text.trim() || depth > 4) return text;
    if (dictionary[text] !== undefined) return dictionary[text];
    if (translated.has(text)) return translated.get(text);
    patterns ??= compilePatterns();
    let result = text;
    for (const { key, names, regex } of patterns) {
        const match = text.match(regex);
        if (!match) continue;
        // the values are names, numbers or texts of the server themselves
        const values = Object.fromEntries(names.map((name, index) => [name, translateValue(match[index + 1], depth + 1)]));
        result = fill(dictionary[key], values);
        break;
    }
    // several reasons in one: each on its own
    if (result === text && text.includes('; ')) result = text.split('; ').map(part => translateText(part, depth + 1)).join('; ');
    translated.set(text, result);
    return result;
};

// the fields of the server's answers that hold its own texts
const TEXT_FIELDS = new Set(['message', 'format', 'title', 'description', 'wash', 'groupTitle', 'label', 'reason', 'requires', 'levelName', 'body', 'detail', 'summary', 'targetLabel', 'short', 'hint']);
// objects of the clubs and the users: their texts are their own
const OWN_TEXTS = ['joinPolicy', 'admins', 'email', 'nickname'];

/**
 * The server's answer with its texts in the language of the app: messages,
 * errors, badges, levels, flights, notifications and fair play findings.
 */
export const translateAnswer = (data) => {
    if (language === 'en') return data;
    const walk = (value) => {
        if (Array.isArray(value)) return value.map(walk);
        if (!value || typeof value !== 'object') return value;
        const own = OWN_TEXTS.some(field => field in value);
        // a level has its name translated (players and clubs keep theirs)
        const level = 'xp' in value && 'id' in value && typeof value.name === 'string';
        const result = {};
        for (const [key, field] of Object.entries(value)) {
            if (typeof field === 'string') result[key] = (!own && TEXT_FIELDS.has(key)) || (level && key === 'name') ? translateText(field) : field;
            else if (key === 'errors' && Array.isArray(field)) result[key] = field.map(entry => translateText(entry));
            else result[key] = walk(field);
        }
        return result;
    };
    return walk(data);
};

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

// a language picked before logging in, to be saved on the account after it
const PENDING_KEY = 'darts-score.language.beforeLogin';

/**
 * Changes the language: saved on this device, and the app starts again in it.
 * reload: false only saves it (the app is reloaded elsewhere).
 * beforeLogin: picked on the start page or the login, so the account takes
 * it over at the next login instead of bringing its own.
 */
export const setLanguage = (code, { reload = true, beforeLogin = false } = {}) => {
    if (!CODES.includes(code)) return;
    try {
        localStorage.setItem(STORAGE_KEY, code);
        if (beforeLogin) localStorage.setItem(PENDING_KEY, code);
        else localStorage.removeItem(PENDING_KEY);
    } catch {
        // without storage the choice lasts until the app is closed
    }
    if (reload && code !== language) window.location.reload();
};

/**
 * The language picked before logging in, if any, and forgets it.
 */
export const takeLanguageChosenBeforeLogin = () => {
    try {
        const pending = localStorage.getItem(PENDING_KEY);
        localStorage.removeItem(PENDING_KEY);
        return CODES.includes(pending) ? pending : null;
    } catch {
        return null;
    }
};

// for formatting numbers and dates the way the language does it
export const locale = () => ({ en: 'en-GB', de: 'de-CH', fr: 'fr-CH', it: 'it-CH', es: 'es-ES' })[language] ?? 'en-GB';
