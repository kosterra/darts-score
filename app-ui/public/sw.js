/*
 * The service worker of Oche, so the app can be installed on a phone or a
 * computer and opens quickly. It only keeps the app itself, never the data:
 * - pages: from the network, the last one kept for when the network is gone
 * - /assets (names change with every build): kept once loaded
 * - icons, pictures and fonts of the app: kept, refreshed in the background
 * - /api: never touched, always the network
 * A new version of this file takes over at once; an old cache is removed.
 */
const CACHE = 'oche-app-v1';
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
                .catch(async () => (await caches.match('/')) ?? Response.error())
        );
        return;
    }

    // built files never change under the same name
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(caches.match(request).then(cached => cached ?? fetch(request).then(response => keep(request, response))));
        return;
    }

    // everything else of the app: what is kept at once, refreshed in the background
    event.respondWith(
        caches.match(request).then(cached => {
            const refreshed = fetch(request).then(response => keep(request, response)).catch(() => cached);
            return cached ?? refreshed;
        })
    );
});
