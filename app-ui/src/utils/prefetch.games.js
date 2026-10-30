/**
 * The pages to play, loaded once in the background while there is a
 * network: the service worker keeps every file it has served (public/sw.js),
 * so a game can then be set up, played and finished without a connection,
 * also on a page never opened before. Only for logged-in users, a while
 * after the app opened, when the browser is idle, and not when the phone
 * asks to save data.
 */
const PAGES = [
    () => import('../components/game_config/x01/_x01.config.page'),
    () => import('../components/games/x01/_x01.game.page'),
    () => import('../components/stats/x01/x01.game.stats'),
    () => import('../components/game_config/cricket/_cricket.config.page'),
    () => import('../components/games/cricket/_cricket.game.page'),
    () => import('../components/stats/cricket/cricket.game.stats'),
    () => import('../components/game_config/elimination/_elimination.config.page'),
    () => import('../components/games/elimination/_elimination.game.page'),
    () => import('../components/stats/elimination/elimination.game.stats'),
    () => import('../components/game_config/clock/_clock.config.page'),
    () => import('../components/games/clock/_clock.game.page'),
    () => import('../components/stats/clock/clock.game.stats'),
    () => import('../components/rules/rules.game.setup'),
    () => import('../components/rules/rules.game'),
    () => import('../components/rules/rules.game.stats'),
];

const DELAY_MS = 8000;
let started = false;

const idle = (callback) => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(callback, { timeout: 10000 }) : setTimeout(callback, 1000));

export const prefetchGamePages = () => {
    // the release build only: on the dev server every module is a file of its own
    if (started || !import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (navigator.connection?.saveData || !navigator.onLine) return;
    started = true;
    setTimeout(() => idle(async () => {
        // one after the other, so the page in use is never held up
        for (const page of PAGES) {
            if (!navigator.onLine) return;
            await page().catch(() => null);
        }
    }), DELAY_MS);
};
