/*
 * The service worker of Legmate, so the app can be installed on a phone or a
 * computer and opens quickly. It only keeps the app itself, never the data:
 * - pages: from the network, the last one kept for when the network is gone
 * - /assets (names change with every build): kept once loaded
 * - icons, pictures and fonts of the app: kept, refreshed in the background
 * - /api: never touched, always the network
 * - what the page loaded before this worker took over: kept when the page
 *   sends its list (see install.js), so the app opens again without a network
 * A new version of this file takes over at once; an old cache is removed.
 * Without the network and without a kept copy the browser gets a network
 * error, as without the service worker (never no answer at all).
 */
const CACHE = 'oche-app-v2';
const SHELL = ['/', '/manifest.json', '/logo.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

const keep = async (request, response) => {
    if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
    }
    return response;
};

// the files the page loaded before this worker took over: { type: 'keep', urls }
self.addEventListener('message', (event) => {
    if (event.data?.type !== 'keep' || !Array.isArray(event.data.urls)) return;
    const urls = event.data.urls
        .map(url => new URL(url, self.location.origin))
        .filter(url => url.origin === self.location.origin && !url.pathname.startsWith('/api/'))
        .map(url => url.pathname);
    event.waitUntil(caches.open(CACHE).then(async cache => {
        await Promise.all([...new Set(urls)].map(async path => {
            if (await cache.match(path, { ignoreVary: true })) return;
            const response = await fetch(path).catch(() => null);
            if (response?.ok) await cache.put(path, response);
        }));
    }));
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

    // a page of the app: the network first, the app kept last when offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => keep('/', response))
                .catch(async () => (await caches.match('/', { ignoreVary: true })) ?? Response.error())
        );
        return;
    }

    // built files never change under the same name
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            // one kept by its path (from the page's list) answers a module request too
            caches.match(request, { ignoreVary: true })
                .then(cached => cached ?? fetch(request).then(response => keep(request, response)))
                .catch(() => Response.error())
        );
        return;
    }

    // everything else of the app: what is kept at once, refreshed in the background
    event.respondWith(
        caches.match(request, { ignoreVary: true }).then(cached => {
            const refreshed = fetch(request).then(response => keep(request, response)).catch(() => cached ?? Response.error());
            return cached ?? refreshed;
        })
    );
});
