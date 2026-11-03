/**
 * The addresses of the app in a language: /de/darts-terms is Darts A–Z in
 * German, /darts-terms in English. Search engines list each language under
 * its own address (the server names them all, with hreflang); in the app a
 * language address is its base, so every link inside stays in it. The API
 * knows the same addresses (app-api/src/utils/page.meta.js).
 */
export const PATH_LANGUAGES = ['de', 'fr', 'it', 'es'];

const PREFIX = new RegExp(`^/(${PATH_LANGUAGES.join('|')})(?=/|$)`);

// the language of an address, null for one without (English, or the language of the device)
export const languageOfPath = (pathname = '') => pathname.match(PREFIX)?.[1] ?? null;

// the base of the app's router for an address: "/de" or "" (none)
export const basenameOf = (pathname = '') => {
    const language = languageOfPath(pathname);
    return language ? `/${language}` : '';
};

// the same page in another language: /de/quick → /fr/quick, → /quick for English
export const pathInLanguage = (pathname, code) => {
    const rest = pathname.replace(PREFIX, '') || '/';
    if (!PATH_LANGUAGES.includes(code)) return rest;
    return rest === '/' ? `/${code}` : `/${code}${rest}`;
};
