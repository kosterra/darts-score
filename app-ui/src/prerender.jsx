/**
 * The public pages rendered ahead, for the search engines and link previews
 * that read the HTML and run no script (scripts/prerender.mjs, after the
 * build). Each page comes as the app shows it to a visitor, in each language,
 * with the links of that language's addresses (/de/…); the API puts it into
 * the page's HTML, and the app replaces it when it starts.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { PrimeReactProvider } from 'primereact/api';

import AuthContext from './utils/auth.context';
import { initLanguage, loadPageTexts } from './utils/i18n';
import { knowPublicSite } from './utils/use.public.site';
import { basenameOf, pathInLanguage } from './utils/language.path';

// the pages the search engines list (app-api/src/utils/page.meta.js PUBLIC_PAGES) that show
// the same to everyone: the contact, support and privacy pages are the operator's, from the API
export const PRERENDERED = {
    '/': () => import('./components/landing/_landing.page'),
    '/darts-terms': () => import('./components/terms/_darts.terms.page'),
    '/whats-new': () => import('./components/whats.new/_whats.new.page'),
    '/quick': () => import('./components/quick/_quick.setup.page'),
    '/evening/new': () => import('./components/evening/evening.new.page'),
};

/**
 * Sets the language, once per fresh load of this module: the texts set up when
 * a page's module loads (What's new, the darts terms) come in it.
 */
export const prepare = async (language) => {
    await initLanguage(language);
    await loadPageTexts();
    knowPublicSite(true);
};

// the HTML of a page in the language prepared
export const render = async (path, language) => {
    const { default: Page } = await PRERENDERED[path]();
    const address = pathInLanguage(path, language);
    return renderToString(
        <PrimeReactProvider>
            <AuthContext.Provider value={{ user: null }}>
                <StaticRouter location={address} basename={basenameOf(address)}>
                    <Page />
                </StaticRouter>
            </AuthContext.Provider>
        </PrimeReactProvider>
    );
};
