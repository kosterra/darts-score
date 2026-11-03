import { describe, it, expect } from 'vitest';
import { basenameOf, languageOfPath, pathInLanguage } from './language.path';

describe('the addresses of the languages', () => {
    it('reads the language of an address', () => {
        expect(languageOfPath('/de/darts-terms')).toBe('de');
        expect(languageOfPath('/fr')).toBe('fr');
        expect(languageOfPath('/darts-terms')).toBeNull();
        // only a whole part of the address
        expect(languageOfPath('/design')).toBeNull();
        expect(languageOfPath('/en/quick')).toBeNull();
    });

    it('makes the base of the router from it', () => {
        expect(basenameOf('/it/quick')).toBe('/it');
        expect(basenameOf('/quick')).toBe('');
    });

    it('finds the same page in another language', () => {
        expect(pathInLanguage('/de/quick', 'fr')).toBe('/fr/quick');
        expect(pathInLanguage('/de/quick', 'en')).toBe('/quick');
        expect(pathInLanguage('/de', 'en')).toBe('/');
        expect(pathInLanguage('/', 'es')).toBe('/es');
        expect(pathInLanguage('/quick', 'it')).toBe('/it/quick');
    });
});
