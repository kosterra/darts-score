import { test, expect } from '@playwright/test';

// Setting up a game: a player who forgot to choose themselves hears it, and joins with one tap
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
});

test('a game without one\'s own player says so, and "Add me" joins it', async ({ page }) => {
    await page.goto('/x01');
    const picker = page.locator('.player-picker');
    await expect(picker.locator('.player-pick-card').first()).toBeVisible();
    // the players of the last game may be chosen already: start from none
    for (const chosen of await picker.locator('.player-pick-card.is-chosen').all()) await chosen.click();
    await expect(picker.locator('.player-picker-not-me')).toHaveCount(0);

    await picker.locator('.player-pick-card', { hasText: 'Ben' }).click();
    await picker.locator('.player-pick-card', { hasText: 'Cleo' }).click();
    const note = picker.locator('.player-picker-not-me');
    await expect(note).toContainText('Ben, Cleo');

    await note.getByRole('button', { name: 'Add me' }).click();
    await expect(note).toHaveCount(0);
    await expect(picker.locator('.player-order-name')).toHaveText(['Ben', 'Cleo', 'Anna']);
});
