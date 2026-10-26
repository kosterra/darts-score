import { test, expect } from '@playwright/test';

// The main pages for each kind of user, at desktop and phone width (see
// playwright.config.js): each one shows what it is about, throws no error
// and does not scroll sideways.
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const AS = {
    visitor: async () => { await post('/__test/logged-out', { loggedOut: true }); },
    player: async () => { await post('/__test/logged-out', { loggedOut: false }); await post('/__test/role', { admin: false }); },
    admin: async () => { await post('/__test/logged-out', { loggedOut: false }); await post('/__test/role', { admin: true }); },
};

const PAGES = {
    visitor: [
        ['/', '.landing-bar'],
        ['/login', '#login-email'],
        ['/register', '#register-firstname'],
        ['/privacy', '.privacy-main'],
        ['/darts-terms', '.terms-page'],
        ['/whats-new', '.release'],
        ['/quick', '.quick-page'],
    ],
    player: [
        ['/', '.dashboard-header'],
        ['/players', '.p-datatable, .player-row, table'],
        ['/players/p1', '.player-hero-dart'],
        ['/profile#player', '#shirt'],
        ['/badges', '.badge-medal, .p-panel'],
        ['/tournaments', '.p-panel, .tournament-row'],
        ['/notifications', '.p-panel'],
    ],
    admin: [
        ['/admin/dashboard', '.admin-tile'],
        ['/admin/backups', '.backup-row'],
        ['/admin/logs', '.admin-table'],
        ['/admin/users', '.admin-table'],
        ['/system-settings', '#session-hours'],
    ],
};

for (const [who, pages] of Object.entries(PAGES)) {
    test.describe(`as ${who}`, () => {
        test.beforeEach(async ({ page }) => {
            await AS[who]();
            // the club the app works in
            await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
        });

        for (const [path, selector] of pages) {
            test(`${path} shows, without errors or sideways scrolling`, async ({ page }) => {
                const errors = [];
                page.on('pageerror', error => errors.push(error.message));
                await page.goto(path);
                await expect(page.locator(selector).first()).toBeVisible();
                await page.waitForLoadState('networkidle');
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
                expect(overflow, 'scrolls sideways by').toBeLessThanOrEqual(1);
                expect(errors).toEqual([]);
            });
        }
    });
}
