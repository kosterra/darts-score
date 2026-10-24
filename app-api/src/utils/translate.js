import TEXTS from '../locales/server.texts.json' with { type: 'json' };

/**
 * The API's own texts in the language of a mail's reader, as the app
 * translates them on screen (app-ui/src/utils/i18n.js): a text the dictionary
 * has as it is, or as a pattern ("{{nickname}} earned {{badge}}") whose values
 * are translated in turn. Unknown texts, e.g. names, stay as they are.
 * The translations come from the app (npm run copy-rules).
 */

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fill = (text, values) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name) => (name in values ? String(values[name]) : all));

// per language: the keys with placeholders as regular expressions, the most specific first
const patterns = new Map();
const patternsOf = (language) => {
    if (!patterns.has(language)) {
        const dictionary = TEXTS[language] ?? {};
        patterns.set(language, Object.keys(dictionary)
            .filter(key => key.includes('{{') && key.replace(/\{\{\s*\w+\s*\}\}/g, '').replace(/[^\p{L}]/gu, '').length >= 4)
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
            }));
    }
    return patterns.get(language);
};

/**
 * The text in the language ('en' and unknown languages leave it as it is).
 */
export const translate = (language, text, depth = 0) => {
    const dictionary = TEXTS[language];
    if (!dictionary || typeof text !== 'string' || !text.trim() || depth > 4) return text;
    if (dictionary[text] !== undefined) return dictionary[text];
    for (const { key, names, regex } of patternsOf(language)) {
        const match = text.match(regex);
        if (!match) continue;
        const values = Object.fromEntries(names.map((name, index) => [name, translate(language, match[index + 1], depth + 1)]));
        return fill(dictionary[key], values);
    }
    // several sentences or reasons in one: each on its own
    if (text.includes('; ')) return text.split('; ').map(part => translate(language, part, depth + 1)).join('; ');
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
        const translated = sentences.map(part => translate(language, part, depth + 1));
        if (translated.some((part, index) => part !== sentences[index])) return translated.join(' ');
    }
    return text;
};

// a text of the API with its placeholders filled, in the language: tr('de', 'Hello {{name}}', { name })
export const tr = (language, text, values = {}) => fill(TEXTS[language]?.[text] ?? text, values);
