// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { problemOf, translationProblems, uiKeys } from '../../scripts/i18n/texts.mjs';

// every text of the app in German, French, Italian and Spanish: npm run i18n missing, then npm run i18n add
describe('the translations', () => {
    it('cover every text of the app and of the API, with the same placeholders', () => {
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
