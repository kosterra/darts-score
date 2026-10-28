import { test, expect } from '@playwright/test';

// For global admins: the all-time count of quick games, the darts evenings with theirs,
// a quick game opened without its key, and a game of another club opened as its admins see it.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.adminClubs', JSON.stringify(['c2']));
    });
});

test('quick games and darts evenings: counted all time, listed, opened', async ({ page }) => {
    await post('/__test/evening', { name: 'Friday at Lena\'s' });

    await page.goto('/admin/quick-games');
    await expect(page.locator('.kpi-headline')).toContainText('Finished, all time');
    await expect(page.locator('.kpi-headline')).toContainText('1,234');
    await expect(page.locator('.kpi-headline')).toContainText('321 in darts evenings');
    // the games of a darts evening are marked with it, and can be shown alone
    await expect(page.locator('.quick-format-tag', { hasText: 'Friday at Lena\'s' }).first()).toBeVisible();
    // on a phone the filters open with their button
    if (test.info().project.name === 'phone') await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.locator('.type-filter').first()).toBeVisible();
    await expect(page.locator('.filter-label', { hasText: 'Played' })).toBeVisible();
    await page.screenshot({ path: `test-results/admin-quick-${test.info().project.name}.png`, fullPage: true });
    // a quick game of this evening, opened without its key on this device
    await page.locator('tr', { hasText: 'Friday at Lena\'s' }).first().locator('.row-action-link[title="Show statistics"]').click();
    await expect(page).toHaveURL(/\/quick\/stats\/x01\/qt\d$/);
    await expect(page.getByText('This quick game was not found on this device.')).toHaveCount(0);
    await expect(page.locator('body')).toContainText('Back to the evening');

    await page.goto('/admin/evenings');
    await expect(page.locator('.kpi-headline')).toContainText('Played, all time');
    await expect(page.locator('.kpi-headline')).toContainText('57');
    const row = page.locator('tr', { hasText: 'Friday at Lena\'s' }).first();
    await expect(row).toContainText('3 games');
    await expect(row).toContainText('Played');
    await page.screenshot({ path: `test-results/admin-evenings-${test.info().project.name}.png`, fullPage: true });
    await row.locator('.row-action-link[title="Open the evening"]').click();
    await expect(page).toHaveURL(/\/evening\/shared\//);
    await expect(page.locator('body')).toContainText('Friday at Lena\'s');
});

test('a game of another club opens as its admins see it, with the way back', async ({ page }) => {
    await page.goto('/admin/games');
    await page.locator('.row-action-link[title="Open the game"]').first().click();
    await expect(page).toHaveURL(/\/x01\/gv1$/);
    const bar = page.locator('.visit-bar');
    await expect(bar).toContainText('Bullseye Bern');
    // the game itself, as the club's admins see it
    await expect(page.locator('.app-content')).toContainText('501', { timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/admin-visit-${test.info().project.name}.png` });
    // the visit lasts a reload, in this tab
    await page.reload();
    await expect(bar).toContainText('Bullseye Bern');
    await bar.getByRole('button', { name: 'Back to the administration' }).click();
    await expect(page).toHaveURL(/\/admin\/games/);
    await expect(bar).toHaveCount(0);
});
