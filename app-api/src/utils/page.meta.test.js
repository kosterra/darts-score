import { describe, it, expect } from 'vitest';
import { languageOfHeader, metaOf, pathInLanguage, renderIndex, robotsOf, sitemapOf, splitLanguage } from './page.meta.js';

const HTML = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta name="description" content="old" />\n    <title>Legmate</title>\n  </head>\n</html>';

describe('the meta of a page', () => {
    it('takes the language the browser asks for first among those of the app', () => {
        expect(languageOfHeader('de-CH,de;q=0.9,en;q=0.8')).toBe('de');
        expect(languageOfHeader('nl-NL,fr;q=0.7,en;q=0.5')).toBe('fr');
        expect(languageOfHeader('')).toBe('en');
        expect(languageOfHeader(undefined)).toBe('en');
    });

    it('names the public pages and lets the search engines list them', () => {
        expect(metaOf('/darts-terms')).toMatchObject({ title: 'Darts A–Z – Legmate', index: true });
        expect(metaOf('/darts-terms/')).toMatchObject({ title: 'Darts A–Z – Legmate' });
        expect(metaOf('/')).toMatchObject({ title: 'Legmate – The darts scoreboard', index: true });
        expect(metaOf('/login').index).toBe(false);
    });

    it('keeps the pages of the app and the shared evenings out of the search engines', () => {
        expect(metaOf('/players/abc')).toMatchObject({ title: 'Legmate', index: false });
        expect(metaOf('/evening/shared/abcdefgh', 'en', { evening: "Friday at Lena's" })).toMatchObject({ title: "Friday at Lena's – Legmate", index: false });
        expect(metaOf('/evening/shared/abcdefgh').title).toBe('Darts evening – Legmate');
        expect(metaOf('/support').title).toBe('Support Legmate');
    });

    it('puts the title, the description, the preview and the address into index.html', () => {
        const html = renderIndex(HTML, metaOf('/privacy'), { base: 'https://oche.example', path: '/privacy', language: 'de' });
        expect(html).toContain('<html lang="de"');
        expect(html).not.toContain('content="old"');
        expect(html).toContain('<link rel="canonical" href="https://oche.example/privacy" />');
        expect(html).toContain('<meta property="og:image" content="https://oche.example/og-image.jpg" />');
        expect(html).toContain('<meta property="og:locale" content="de_CH" />');
        expect(html).toContain('twitter:card');
        expect(html.match(/<title>/g)).toHaveLength(1);
    });

    it('escapes what a name brings along', () => {
        const html = renderIndex(HTML, metaOf('/evening/shared/abcdefgh', 'en', { evening: '<b>"Bad"</b>' }), { base: 'https://x', path: '/evening/shared/abcdefgh', language: 'en' });
        expect(html).toContain('&lt;b&gt;&quot;Bad&quot;&lt;/b&gt;');
        expect(html).toContain('<meta name="robots" content="noindex" />');
    });

    it('lists the public pages in the sitemap and points to it from robots.txt', () => {
        const sitemap = sitemapOf('https://oche.example');
        expect(sitemap).toContain('<loc>https://oche.example/darts-terms</loc>');
        expect(sitemap).not.toContain('/login');
        expect(robotsOf('https://oche.example')).toContain('Sitemap: https://oche.example/sitemap.xml');
        expect(robotsOf('https://oche.example')).toContain('Disallow: /api/');
        // an installation that opens with the login lists the other public pages only
        expect(sitemapOf('https://oche.example', { publicSite: false })).not.toContain('<loc>https://oche.example/</loc>');
        expect(metaOf('/', 'en', { publicSite: false }).index).toBe(false);
    });
});

describe('the addresses of the languages', () => {
    it('takes the language off the address, and puts it on', () => {
        expect(splitLanguage('/de/darts-terms')).toEqual({ language: 'de', path: '/darts-terms' });
        expect(splitLanguage('/fr')).toEqual({ language: 'fr', path: '/' });
        expect(splitLanguage('/darts-terms')).toEqual({ language: null, path: '/darts-terms' });
        // only a whole part of the address is a language
        expect(splitLanguage('/design')).toEqual({ language: null, path: '/design' });
        expect(pathInLanguage('/quick', 'it')).toBe('/it/quick');
        expect(pathInLanguage('/', 'es')).toBe('/es');
        expect(pathInLanguage('/quick', 'en')).toBe('/quick');
        expect(pathInLanguage('/quick', null)).toBe('/quick');
    });

    it('names the page in every language beside its own address', () => {
        const html = renderIndex(HTML, metaOf('/quick', 'de'), { base: 'https://oche.example', path: '/de/quick', page: '/quick', language: 'de' });
        expect(html).toContain('<link rel="canonical" href="https://oche.example/de/quick" />');
        expect(html).toContain('<link rel="alternate" hreflang="en" href="https://oche.example/quick" />');
        expect(html).toContain('<link rel="alternate" hreflang="fr" href="https://oche.example/fr/quick" />');
        expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://oche.example/quick" />');
        // a page not to be listed has none
        expect(renderIndex(HTML, metaOf('/login'), { base: 'https://x', path: '/login', language: 'en' })).not.toContain('hreflang');
    });

    it('puts the page as the app shows it into the HTML of a listed page only', () => {
        const page = '<!doctype html>\n<html lang="en"><head><title>Legmate</title></head><body><div id="root"></div></body></html>';
        const listed = renderIndex(page, metaOf('/darts-terms'), { base: 'https://x', path: '/darts-terms', language: 'en', prerendered: '<h1>Darts A–Z</h1>' });
        expect(listed).toContain('<div id="root"><div data-prerendered><h1>Darts A–Z</h1></div></div>');
        const hidden = renderIndex(page, metaOf('/login'), { base: 'https://x', path: '/login', language: 'en', prerendered: '<h1>Log in</h1>' });
        expect(hidden).toContain('<div id="root"></div>');
    });

    it('lists every language of a page in the sitemap, each with the others', () => {
        const sitemap = sitemapOf('https://oche.example');
        expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
        expect(sitemap).toContain('<loc>https://oche.example/de/darts-terms</loc>');
        expect(sitemap).toContain('<loc>https://oche.example/es</loc>');
        expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="it" href="https://oche.example/it/darts-terms" />');
        expect(sitemapOf('https://oche.example', { publicSite: false })).not.toContain('<loc>https://oche.example/de</loc>');
    });
});

describe('the structured data for the search engines', () => {
    const html = '<html lang="en"><head><title>Legmate</title></head><body></body></html>';
    const dataOf = (page) => JSON.parse(page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1] ?? 'null');

    it('names the website, its logo and the free web app on the start page', () => {
        const page = renderIndex(html, metaOf('/', 'en'), { base: 'https://legmate.ch', path: '/', language: 'en' });
        const graph = dataOf(page)['@graph'];
        expect(graph.find(node => node['@type'] === 'WebSite')).toMatchObject({ name: 'Legmate', url: 'https://legmate.ch/' });
        expect(graph.find(node => node['@type'] === 'Organization').logo).toBe('https://legmate.ch/icons/icon-512.png');
        expect(graph.find(node => node['@type'] === 'WebApplication').offers.price).toBe('0');
    });

    it('stays off the other pages, and off a start page that is not listed', () => {
        expect(dataOf(renderIndex(html, metaOf('/privacy', 'en'), { base: 'https://legmate.ch', path: '/privacy', language: 'en' }))).toBeNull();
        expect(dataOf(renderIndex(html, metaOf('/', 'en', { publicSite: false }), { base: 'https://legmate.ch', path: '/', language: 'en' }))).toBeNull();
    });
});
