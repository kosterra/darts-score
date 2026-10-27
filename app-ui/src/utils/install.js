/**
 * Legmate as an app on the home screen: the service worker, and the browser's
 * offer to install it (Chrome, Edge, Samsung Internet), kept until the app
 * asks for it. Safari on iPhone and iPad has no such offer: there it is
 * added with Share → Add to Home Screen.
 */

let offer = null;
const listeners = new Set();
const announce = () => listeners.forEach(listener => listener());

export const registerServiceWorker = () => {
    // the dev server builds every file anew, so only a built app has one
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => console.error('The service worker could not be registered', error));
        // what this page loaded before the worker was there, so it opens again without a network
        navigator.serviceWorker.ready.then(registration => {
            const urls = performance.getEntriesByType('resource').map(entry => entry.name).filter(name => new URL(name).origin === location.origin);
            registration.active?.postMessage({ type: 'keep', urls });
        }).catch(() => {});
    });
};

export const listenForInstallOffer = () => {
    window.addEventListener('beforeinstallprompt', (event) => {
        // the app shows its own hint instead of the browser's bar
        event.preventDefault();
        offer = event;
        announce();
    });
    window.addEventListener('appinstalled', () => {
        offer = null;
        announce();
    });
};

export const onInstallChange = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const canInstall = () => offer !== null;

// shows the browser's own dialog; true when the app was installed
export const install = async () => {
    if (!offer) return false;
    const current = offer;
    offer = null;
    current.prompt();
    const { outcome } = await current.userChoice;
    announce();
    return outcome === 'accepted';
};

// already opened from the home screen
export const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

// Safari on an iPhone or iPad (an iPad says it is a Mac, but has touch)
export const isIosSafari = () => {
    const { userAgent, maxTouchPoints } = window.navigator;
    const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
    return ios && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
};
