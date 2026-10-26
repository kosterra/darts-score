/* global console, process */
// The translations of the app (src/locales: de, fr, it, es; English is the key itself):
//
//   npm run i18n check                 what is missing or wrong (also a test: src/locales/locales.test.js)
//   npm run i18n missing [file]        writes the missing texts to a file to fill in: { "text": ["de", "fr", "it", "es"] }
//   npm run i18n add <file> [--server] adds a filled-in file; --server: the texts are also the API's (src/locales/server.json)
//   npm run i18n prune                 removes translations no text of the app uses any more
//
// German in Swiss spelling (ss, never ß), the informal "du", darts terms in English.
// After adding texts of the API: npm run copy-rules, for the API's copy.
import path from 'node:path';
import fs from 'node:fs';
import { LANGUAGES, LOCALES, problemOf, readLocale, serverKeys, translationProblems, uiKeys, writeJson } from './i18n/texts.mjs';

const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const [command, ...args] = process.argv.slice(2);

const check = () => {
    const problems = translationProblems();
    for (const { key, where, language, problem } of problems) console.log(`${language}  ${problem.padEnd(10)}  ${where}  ${JSON.stringify(key).slice(0, 110)}`);
    console.log(problems.length ? `${problems.length} problems in ${new Set(problems.map(entry => entry.key)).size} texts` : 'Every text is translated.');
    return problems.length;
};

const missing = (file = 'missing-translations.json') => {
    const problems = translationProblems();
    const locales = Object.fromEntries(LANGUAGES.map(language => [language, readLocale(language)]));
    const template = Object.fromEntries([...new Set(problems.map(entry => entry.key))].map(key => [key, LANGUAGES.map(language => locales[language][key] ?? '')]));
    writeJson(path.resolve(file), template);
    console.log(`${Object.keys(template).length} texts to translate, written to ${file} as { "text": [${LANGUAGES.map(language => `"${language}"`).join(', ')}] }`);
};

const add = (file, server) => {
    if (!file) throw new Error('Which file? npm run i18n add <file> [--server]');
    const entries = Object.entries(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')));
    const errors = entries.flatMap(([key, texts]) => LANGUAGES
        .map((language, index) => [language, problemOf(key, texts?.[index], language)])
        .filter(([, problem]) => problem)
        .map(([language, problem]) => `${language}: ${problem} · ${key.slice(0, 80)}`));
    if (errors.length) {
        errors.forEach(error => console.error(error));
        throw new Error(`${errors.length} translations to fix first, nothing was added.`);
    }
    for (const [index, language] of LANGUAGES.entries()) {
        const locale = readLocale(language);
        for (const [key, texts] of entries) locale[key] = texts[index];
        writeJson(path.join(LOCALES, `${language}.json`), sorted(locale));
    }
    if (server) writeJson(path.join(LOCALES, 'server.json'), [...new Set([...serverKeys(), ...entries.map(([key]) => key)])].sort());
    console.log(`Added ${entries.length} texts${server ? ' (also as texts of the API: run npm run copy-rules)' : ''}.`);
};

const prune = () => {
    const used = new Set([...uiKeys().keys(), ...serverKeys()]);
    let removed = 0;
    for (const language of LANGUAGES) {
        const locale = readLocale(language);
        const kept = Object.fromEntries(Object.entries(locale).filter(([key]) => used.has(key)));
        removed = Math.max(removed, Object.keys(locale).length - Object.keys(kept).length);
        writeJson(path.join(LOCALES, `${language}.json`), sorted(kept));
    }
    console.log(`Removed ${removed} translations no text uses any more.`);
};

try {
    if (command === 'check') process.exitCode = check() ? 1 : 0;
    else if (command === 'missing') missing(args[0]);
    else if (command === 'add') add(args.find(arg => !arg.startsWith('--')), args.includes('--server'));
    else if (command === 'prune') prune();
    else console.log('npm run i18n check | missing [file] | add <file> [--server] | prune');
} catch (err) {
    console.error(err.message);
    process.exitCode = 1;
}
