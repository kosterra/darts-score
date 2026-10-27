import { test, expect } from '@playwright/test';

// Legmate added to the home screen: no start page about Legmate, the login
// at once, with the games that need no account.
const MOCK = 'http://localhost:3901';

test('the installed app opens with the login and offers the games without an account', async ({ page }) => {
    await fetch(`${MOCK}/__test/logged-out`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loggedOut: true }) });
    // as the browser reports an app on the home screen
    await page.addInitScript(() => {
        const real = window.matchMedia.bind(window);
        window.matchMedia = (query) => (query.includes('display-mode: standalone') ? { ...real(query), matches: true, media: query } : real(query));
    });
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Features' })).toHaveCount(0);
    await page.locator('.auth-play-now').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/installed-login-${test.info().project.name}.png` });
    await page.getByRole('link', { name: 'Quick game' }).first().click();
    await expect(page).toHaveURL(/\/quick$/);
});

test('in the browser the start page stays', async ({ page }) => {
    await fetch(`${MOCK}/__test/logged-out`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loggedOut: true }) });
    await page.goto('/');
    await expect(page.locator('.landing-bar')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/login');
    await expect(page.locator('.auth-play-now')).toHaveCount(0);
});
