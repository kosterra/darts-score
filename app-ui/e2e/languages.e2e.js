import { test, expect } from '@playwright/test';

// An address of a language (/de/…) opens the public pages in it, whatever the
// browser asks for, and the links on them stay at the addresses of that language.
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('Darts A–Z in German at /de/darts-terms, its links staying German', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: true });
    await page.goto('/de/darts-terms');
    await expect(page.locator('.terms-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sprich Darts');
    await expect(page.locator('a[href="/de/quick"]').first()).toBeAttached();
    await expect(page.locator('a[href="/quick"]')).toHaveCount(0);
});
