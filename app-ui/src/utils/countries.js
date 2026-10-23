import { t, locale } from './i18n';

// the nations of the United Kingdom play darts on their own (World Cup of
// Darts, the PDC); the browser has no names for them
const HOME_NATIONS = {
    'GB-ENG': 'England',
    'GB-SCT': 'Scotland',
    'GB-WLS': 'Wales',
    'GB-NIR': 'Northern Ireland',
};

// the flags as pictures (emoji flags show as letters on Windows), by their
// code (CH, GB-ENG); each one is only loaded where it is shown
export const FLAGS = Object.fromEntries(
    Object.entries(import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', { eager: true, query: '?no-inline', import: 'default' }))
        .map(([path, url]) => [path.match(/\/([A-Z]{2}(?:-[A-Z]{3})?)\.svg$/)?.[1], url])
        .filter(([code]) => code && (code.length === 2 || HOME_NATIONS[code]))
);

// the name of a country in the language of the app: "Schweiz", "Suisse", …
export const countryName = (code) => {
    if (!code) return '';
    if (HOME_NATIONS[code]) return t(HOME_NATIONS[code]);
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
