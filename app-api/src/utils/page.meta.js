import { LANGUAGES } from '../models/user.model.js';
import { translate } from './translate.js';

/**
 * What a page says about itself before the app runs: its title, description
 * and picture for search engines and for the preview of a shared link
 * (WhatsApp, Facebook, …), which read the HTML and run no script. The texts
 * come in the language the visitor's browser asks for.
 */

const BRAND = 'Legmate';
const DEFAULT_DESCRIPTION = 'The darts scoreboard for your club, your pub team, your flatshare or your living room: X01, Cricket, Elimination and six more games, trainings, statistics, badges, levels and tournaments. Free and without ads.';
const LOCALES = { en: 'en_GB', de: 'de_CH', fr: 'fr_CH', it: 'it_CH', es: 'es_ES' };
export const OG_IMAGE = { path: '/og-image.jpg', width: 1200, height: 630 };

// the public pages, for the search engines (sitemap.xml) and their previews
export const PUBLIC_PAGES = {
    '/': { title: 'The darts scoreboard', description: DEFAULT_DESCRIPTION },
    '/darts-terms': { title: 'Darts A–Z', description: 'How the board hangs, a game of 501 in five steps, and the darts terms explained: from the oche to the Madhouse.' },
    '/whats-new': { title: "What's new", description: 'The latest games, features and fixes of Legmate, release by release.' },
    '/quick': { title: 'Quick game', description: 'X01, Cricket or Elimination for up to four players, without an account: the full scoreboard, and the statistics of the game at the end.' },
    '/evening/new': { title: 'Darts evening', description: 'Up to eight players, game after game, a table of the evening and awards, and friends follow it on their phones. No account needed.' },
    '/contact': { title: 'Contact', description: 'Feedback and questions to the people who run Legmate, and problems and ideas on GitHub.' },
    '/support': { title: 'Support Legmate', description: 'Legmate is free for everyone and without ads. Help to keep it that way.' },
    '/privacy': { title: 'Privacy', description: 'Which personal data Legmate keeps, why, for how long, and what your rights are.' },
    '/register': { title: 'Register', description: DEFAULT_DESCRIPTION },
    '/login': { title: 'Log in', description: DEFAULT_DESCRIPTION },
};

// the language a browser asks for first among those of the app: "de-CH,de;q=0.9,en;q=0.8" → de
export const languageOfHeader = (header = '') => {
    const asked = String(header).split(',')
        .map(part => {
            const [tag, q] = part.trim().split(';q=');
            return { language: tag.slice(0, 2).toLowerCase(), q: q === undefined ? 1 : Number(q) };
        })
        .filter(entry => LANGUAGES.includes(entry.language) && entry.q > 0)
        .sort((a, b) => b.q - a.q);
    return asked[0]?.language ?? 'en';
};

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The meta of a path: { title, description, index (whether search engines
 * may list it) }. evening: the name of a shared darts evening, when the path
 * is one (undefined: not found). publicSite false: the installation opens
 * with the login, its start page is not listed.
 */
export const metaOf = (pathname, language = 'en', { evening, publicSite = true } = {}) => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    const tr = (text) => translate(language, text);
    if (path.startsWith('/evening/shared/')) {
        const name = evening || tr('Darts evening');
        return { title: `${name} – ${BRAND}`, description: tr('Follow the darts evening live: the table, the awards and the games.'), index: false };
    }
    const page = PUBLIC_PAGES[path];
    if (path === '/' && !publicSite) return { title: BRAND, description: tr(DEFAULT_DESCRIPTION), index: false };
    if (!page) return { title: BRAND, description: tr(DEFAULT_DESCRIPTION), index: false };
    return {
        // "Support Legmate" names Legmate already
        title: path === '/' ? `${BRAND} – ${tr(page.title)}` : page.title.includes(BRAND) ? tr(page.title) : `${tr(page.title)} – ${BRAND}`,
        description: tr(page.description),
        index: !['/register', '/login'].includes(path),
    };
};

/**
 * index.html with the meta of the page: the title, the description, the
 * Open Graph and Twitter tags of the preview, the canonical address and,
 * for pages not to be listed, noindex. base: the address of the installation.
 */
// for the search engines, on the start page: the website and its name, who it is from with
// the logo, and that it is a free web app for darts (schema.org)
const structuredData = (base, description) => JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
        { '@type': 'WebSite', '@id': `${base}/#website`, name: BRAND, alternateName: `${BRAND} darts scoreboard`, url: `${base}/`, publisher: { '@id': `${base}/#organization` } },
        { '@type': 'Organization', '@id': `${base}/#organization`, name: BRAND, url: `${base}/`, logo: `${base}/icons/icon-512.png` },
        {
            '@type': 'WebApplication', name: BRAND, url: `${base}/`, description, applicationCategory: 'GameApplication', operatingSystem: 'Any (web browser)',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'CHF' }, image: `${base}${OG_IMAGE.path}`,
        },
    ],
}).replace(/</g, '\\u003c');

export const renderIndex = (html, { title, description, index }, { base, path, language }) => {
    const url = `${base}${path}`;
    const tags = [
        `<title>${escape(title)}</title>`,
        `<meta name="description" content="${escape(description)}" />`,
        index ? `<link rel="canonical" href="${escape(url)}" />` : '<meta name="robots" content="noindex" />',
        '<meta property="og:type" content="website" />',
        `<meta property="og:site_name" content="${BRAND}" />`,
        `<meta property="og:title" content="${escape(title)}" />`,
        `<meta property="og:description" content="${escape(description)}" />`,
        `<meta property="og:url" content="${escape(url)}" />`,
        `<meta property="og:locale" content="${LOCALES[language] ?? LOCALES.en}" />`,
        `<meta property="og:image" content="${escape(base + OG_IMAGE.path)}" />`,
        `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
        `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
        `<meta property="og:image:alt" content="${escape(translate(language, 'The darts scoreboard'))}" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
        ...(path === '/' && index && base ? [`<script type="application/ld+json">${structuredData(base, description)}</script>`] : []),
    ].join('\n    ');
    return html
        .replace(/<meta name="description"[^>]*>\s*/i, '')
        .replace(/<title>[^<]*<\/title>/i, tags)
        .replace(/<html lang="[^"]*"/i, `<html lang="${language}"`);
};

// the public pages for the search engines
export const sitemapOf = (base, { publicSite = true } = {}) => [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Object.entries(PUBLIC_PAGES)
        .filter(([path]) => metaOf(path, 'en', { publicSite }).index)
        .map(([path]) => `  <url><loc>${escape(base + path)}</loc><changefreq>${path === '/whats-new' ? 'weekly' : 'monthly'}</changefreq></url>`),
    '</urlset>',
    '',
].join('\n');

export const robotsOf = (base) => `User-agent: *\nDisallow: /api/\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`;
