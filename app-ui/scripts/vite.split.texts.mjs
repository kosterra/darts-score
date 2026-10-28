/**
 * The texts of a language in two parts: those only the About pages, What's
 * new, the legal pages and Darts A–Z show (about a third, mostly What's new
 * and the guides), and all the others. The app loads the main part when it
 * starts and the pages part when one of those pages opens (loadPageTexts in
 * utils/i18n.js), so the first load is lighter. The source stays one file
 * per language (src/locales); the split is worked out from where each text
 * is written: a text goes to the pages part only when it appears in those
 * pages alone. One used anywhere else, or not written out at all (texts of
 * the API, texts put together at run time), stays in the main part.
 *
 * import('virtual:texts/de.main'), import('virtual:texts/de.pages')
 */
import fs from 'node:fs';
import path from 'node:path';

// the pages, and the parts only they use
export const PAGE_FILES = [
    'components/about/_about.page.jsx',
    'components/about/about.card.jsx',
    'components/about/changelog.js',
    'components/about/guides.jsx',
    'components/about/levels.section.jsx',
    'components/about/release.notes.jsx',
    'components/whats.new/_whats.new.page.jsx',
    'components/legal/_contact.page.jsx',
    'components/legal/_privacy.page.jsx',
    'components/legal/_support.page.jsx',
    'components/terms/_darts.terms.page.jsx',
];

const PREFIX = 'virtual:texts/';
const SOURCE = /\.(js|jsx|ts|tsx|mjs)$/;
const LITERAL = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

const sourcesOf = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : sourcesOf(full);
    return SOURCE.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
});

// every string written in a file, as it reads
const literalsOf = (file) => {
    const found = new Set();
    for (const match of fs.readFileSync(file, 'utf8').matchAll(LITERAL)) found.add(match[2].replace(/\\(.)/g, '$1'));
    return found;
};

/**
 * The texts only the pages use: written in a page file, and in no other.
 */
export const pageOnlyTexts = (srcDir) => {
    const pages = new Set(PAGE_FILES.map(file => path.join(srcDir, file)));
    const inPages = new Set();
    const elsewhere = new Set();
    for (const file of sourcesOf(srcDir)) {
        const into = pages.has(file) ? inPages : elsewhere;
        for (const literal of literalsOf(file)) into.add(literal);
    }
    // the texts of the API are translated wherever an answer shows them
    const server = new Set(JSON.parse(fs.readFileSync(path.join(srcDir, 'locales', 'server.json'), 'utf8')));
    return new Set([...inPages].filter(text => !elsewhere.has(text) && !server.has(text)));
};

export default function splitTexts(srcDir) {
    let cached = null;
    return {
        name: 'split-texts',
        resolveId: (id) => (id.startsWith(PREFIX) ? `\0${id}` : null),
        load(id) {
            if (!id.startsWith(`\0${PREFIX}`)) return null;
            const [language, part] = id.slice(PREFIX.length + 1).split('.');
            const file = path.join(srcDir, 'locales', `${language}.json`);
            this.addWatchFile(file);
            // worked out once per build; on the dev server each time, as the code changes
            const pageOnly = cached ?? pageOnlyTexts(srcDir);
            if (this.meta.watchMode === false) cached = pageOnly;
            const texts = JSON.parse(fs.readFileSync(file, 'utf8'));
            const chosen = Object.fromEntries(Object.entries(texts).filter(([key]) => (part === 'pages') === pageOnly.has(key)));
            return `export default ${JSON.stringify(chosen)};`;
        },
    };
}
