/**
 * The logo of the app, its address with the version: the browser, Cloudflare
 * (four hours) and the service worker keep /logo.svg, so with a new logo the
 * old one would show on for a while; with every version it is fetched anew.
 */
export const LOGO = `/logo.svg?v=${import.meta.env.VITE_APP_VERSION ?? 'dev'}`;
