import { test, expect, MOCK } from './fixtures.js';

// The favourites on one's own Dashboard hold the trainings trained most too: Train starts one at
// once with its settings, and the way back does not start it again.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const asPlayer = async (page) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
};

test('favourite trainings on the Dashboard start at once', async ({ page }) => {
    await asPlayer(page);
    await page.goto('/');
    const widget = page.locator('.p-panel', { has: page.getByText('Your favourites', { exact: true }) });
    const checkout = widget.locator('.favourite', { hasText: '121 Checkout' });
    await expect(checkout).toContainText('20 attempts · trained 9 times');
    await expect(widget.locator('.favourite', { hasText: 'Around the Clock' })).toContainText('Against the clock · Double');

    await checkout.getByRole('button', { name: 'Train' }).click();
    await expect(page).toHaveURL(/\/training\/checkout121$/);
    // running: no setup, the attempts of the chosen setting
    await expect(page.getByRole('button', { name: 'Start training' })).toHaveCount(0);
    await expect(page.getByText('1 / 20', { exact: false }).first()).toBeVisible();

    await page.goto('/');
    await widget.locator('.favourite', { hasText: 'Around the Clock' }).getByRole('button', { name: 'Train' }).click();
    await expect(page).toHaveURL(/\/training\/atc$/);
    await expect(page.getByText('Stopwatch', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start training' })).toHaveCount(0);
    // a reload comes back to the setup, not a second start
    await page.reload();
    await expect(page.getByRole('button', { name: 'Start training' })).toBeVisible();
});
