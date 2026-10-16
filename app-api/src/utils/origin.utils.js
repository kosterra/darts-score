/**
 * Whether a browser request may use the API. Allowed are requests without an
 * Origin header (same-origin GETs, tools), requests from the app's own address
 * (the Host the request reached, or the one a reverse proxy forwards) and from
 * the configured addresses (APP_URL, and UI_URL when the UI runs on its own).
 * Everything else is another site and is refused.
 */
export const isAllowedOrigin = ({ origin, host, forwardedHost, allowedOrigins = [] }) => {
    if (!origin) return true;
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.some(allowed => allowed && allowed.replace(/\/+$/, '') === normalized)) return true;
    let originHost;
    try {
        originHost = new URL(normalized).host;
    } catch {
        return false;
    }
    // a proxy may forward several hosts, the first is the one the browser used
    const forwarded = (forwardedHost ?? '').split(',')[0].trim();
    return originHost === host || (forwarded !== '' && originHost === forwarded);
};
