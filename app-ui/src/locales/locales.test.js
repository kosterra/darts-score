// @vitest-environment node
import { describe, expect, it } from 'vitest';
import de from './de.json';
import fr from './fr.json';
import it_ from './it.json';
import es from './es.json';
import { problemOf, translationProblems, uiKeys } from '../../scripts/i18n/texts.mjs';

const DICTIONARIES = { de, fr, it: it_, es };
const placeholders = (text) => (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();

describe('dictionaries', () => {
    it('have the same texts in every language', () => {
        const keys = Object.keys(de).sort();
        for (const dictionary of Object.values(DICTIONARIES)) expect(Object.keys(dictionary).sort()).toEqual(keys);
    });

    it('keep the placeholders of the English text', () => {
        for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
            for (const [english, translated] of Object.entries(dictionary)) {
                expect(placeholders(translated), `${language}: ${english}`).toEqual(placeholders(english));
            }
        }
    });

    it('write Swiss German, without ß', () => {
        expect(Object.values(de).filter(text => text.includes('ß'))).toEqual([]);
    });
});

// every text of the app in German, French, Italian and Spanish: npm run i18n missing, then npm run i18n add
// these read every source file: under the load of the whole suite they need more than the 5 s default
describe('the translations', { timeout: 30000 }, () => {
    it('cover every text of the app and of the API', () => {
        const problems = translationProblems().map(({ key, where, language, problem }) => `${language} ${problem}: ${where} ${key}`);
        expect(problems).toEqual([]);
    });

    it('find the texts of the source', () => {
        const keys = uiKeys();
        expect(keys.get('Back up now')).toMatch(/backups\.page\.jsx$/);
        expect(keys.has('{{count}} games')).toBe(true);
    });

    it('catch what a translation gets wrong', () => {
        expect(problemOf('{{count}} games', '{{count}} Spiele', 'de')).toBeNull();
        expect(problemOf('{{count}} games', 'Spiele', 'de')).toMatch(/placeholders/);
        expect(problemOf('Close', 'Schließen', 'de')).toMatch(/ß/);
        expect(problemOf('Close', '', 'fr')).toBe('missing');
    });
});
