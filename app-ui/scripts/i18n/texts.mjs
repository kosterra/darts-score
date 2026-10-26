// The texts of the app to translate: every t('…') and tn(…, '…', '…') in
// the source, the keys built at run time, and the API's texts that reach the
// user (src/locales/server.json). Used by the translation commands
// (scripts/i18n.mjs) and by the test that keeps the translations complete.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';

const traverse = babelTraverse.default ?? babelTraverse;
const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '../../src');
export const LOCALES = path.join(SRC, 'locales');
export const LANGUAGES = ['de', 'fr', 'it', 'es'];

// keys put together while the app runs, which no t('…') spells out
const RUNTIME_KEYS = [
    ...['game', 'dart', 'leg', 'set', 'quick game', 'player', 'training', 'club', 'user', 'alert', 'entry'].flatMap(word => [`{{count}} ${word}`, `{{count}} ${word}s`]),
    'England', 'Scotland', 'Wales', 'Northern Ireland', 'wins', 'avg', '× 180', 'Single', 'Double', 'Triple', 'All', 'rounds', 'times',
    ...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => `Plays mostly on ${day}s`),
];

const sourceFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : sourceFiles(file);
    return /\.(jsx?|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [file] : [];
});

/**
 * The keys of the UI: Map key → the file it was found in (first one).
 */
export const uiKeys = (src = SRC) => {
    const keys = new Map();
    const add = (key, where) => { if (!keys.has(key)) keys.set(key, where); };
    for (const file of sourceFiles(src)) {
        let ast;
        try {
            ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'typescript'] });
        } catch {
            continue;
        }
        const where = path.relative(src, file);
        traverse(ast, {
            CallExpression(nodePath) {
                const { callee, arguments: args } = nodePath.node;
                if (callee.type !== 'Identifier' || !['t', 'tn'].includes(callee.name)) return;
                const collect = (node) => {
                    if (!node) return;
                    if (node.type === 'StringLiteral') add(node.value, where);
                    else if (node.type === 'ConditionalExpression') { collect(node.consequent); collect(node.alternate); }
                    else if (node.type === 'LogicalExpression') { collect(node.left); collect(node.right); }
                    // t({ shape: '…', design: '…' }[kind])
                    else if (node.type === 'MemberExpression' && node.object.type === 'ObjectExpression') node.object.properties.forEach(prop => collect(prop.value));
                };
                (callee.name === 't' ? [args[0]] : [args[1], args[2]]).forEach(collect);
            },
        });
    }
    for (const key of RUNTIME_KEYS) add(key, 'run time');
    return keys;
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const readLocale = (language) => readJson(path.join(LOCALES, `${language}.json`));
export const serverKeys = () => readJson(path.join(LOCALES, 'server.json'));

// replaces a file in one step: the dev server watching the source never reads half of it
export const writeJson = (file, value) => {
    fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 1)}\n`);
    fs.renameSync(`${file}.tmp`, file);
};

const placeholders = (text) => (String(text).match(/\{\{\s*\w+\s*\}\}/g) ?? []).map(entry => entry.replace(/\s/g, '')).sort();

/**
 * What is wrong with a translation, or null: empty, other placeholders than
 * the English text, or a German ß (Swiss German writes ss).
 */
export const problemOf = (key, text, language) => {
    if (typeof text !== 'string' || !text.trim()) return 'missing';
    if (placeholders(key).join() !== placeholders(text).join()) return `placeholders ${placeholders(text).join(' ') || 'none'} instead of ${placeholders(key).join(' ') || 'none'}`;
    if (language === 'de' && text.includes('ß')) return 'ß instead of ss';
    return null;
};

/**
 * Every text of the app with what is wrong with it in each language:
 * [{ key, where, language, problem }]. Empty when all is translated.
 */
export const translationProblems = () => {
    const keys = uiKeys();
    for (const key of serverKeys()) if (!keys.has(key)) keys.set(key, 'API');
    const locales = Object.fromEntries(LANGUAGES.map(language => [language, readLocale(language)]));
    const problems = [];
    for (const [key, where] of keys) {
        for (const language of LANGUAGES) {
            const problem = problemOf(key, locales[language][key], language);
            if (problem) problems.push({ key, where, language, problem });
        }
    }
    return problems;
};

