import { describe, expect, it } from 'vitest';
import de from './de.json';
import fr from './fr.json';
import it_ from './it.json';
import es from './es.json';

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
