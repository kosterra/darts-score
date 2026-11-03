/* global console, process */
// The public pages rendered ahead in every language (src/prerender.jsx), after
// `vite build`: dist/prerender.json { "de": { "/darts-terms": "<…>" }, … }, which
// the API puts into the HTML of those pages (app-api/src/utils/page.meta.js).
// Vite loads the sources for Node; each language gets the modules fresh, so the
// texts set up when a module loads come in that language.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];

const server = await createServer({ root, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
const pages = {};
let failed = false;
try {
    for (const language of LANGUAGES) {
        server.moduleGraph.invalidateAll();
        const { PRERENDERED, prepare, render } = await server.ssrLoadModule('/src/prerender.jsx');
        await prepare(language);
        pages[language] = {};
        for (const page of Object.keys(PRERENDERED)) {
            try {
                pages[language][page] = await render(page, language);
            } catch (error) {
                // a page that cannot be rendered ahead is served as before, the app shows it
                failed = true;
                console.error(`Could not render ${page} in ${language}:`, error.message);
            }
        }
    }
} finally {
    await server.close();
}
fs.writeFileSync(path.join(root, 'dist', 'prerender.json'), JSON.stringify(pages));
const count = Object.values(pages).reduce((sum, list) => sum + Object.keys(list).length, 0);
console.log(`Rendered ${count} public pages ahead in ${LANGUAGES.length} languages`);
if (failed && process.env.CI) process.exit(1);
