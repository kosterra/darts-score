import { locale } from './i18n';

// the flags as pictures (emoji flags show as letters on Windows); each one is
// only loaded where it is shown
export const FLAGS = Object.fromEntries(
    Object.entries(import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', { eager: true, query: '?no-inline', import: 'default' }))
        .map(([path, url]) => [path.match(/([A-Z]{2})\.svg$/)?.[1], url])
        .filter(([code]) => code)
);

// the name of a country in the language of the app: "Schweiz", "Suisse", …
export const countryName = (code) => {
    if (!code) return '';
    try {
        return new Intl.DisplayNames([locale()], { type: 'region' }).of(code) ?? code;
    } catch {
        return code;
    }
};

/**
 * The countries a club can be in, by their name in the language of the app:
 * [{ code, name }]. Codes the browser has no name for (e.g. the EU) are left out.
 */
export const countries = () => Object.keys(FLAGS)
    .map(code => ({ code, name: countryName(code) }))
    .filter(({ code, name }) => name && name !== code)
    .sort((a, b) => a.name.localeCompare(b.name, locale()));
