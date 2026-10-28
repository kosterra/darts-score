import { test, expect } from '@playwright/test';

// A club night tonight: its club evening with the members who said they come, a club game
// started among them, and the table of the evening.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('the club evening of tonight\'s club night', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await post('/__test/calendar', { scenario: 'tonight' });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/calendar');
    await page.getByRole('link', { name: 'Club evening' }).first().click();
    await expect(page).toHaveURL(/\/club-night\/\d{4}-\d{2}-\d{2}$/);

    // the three coming, and one more added by hand
    await expect(page.locator('.club-night-chip')).toHaveCount(3);
    await page.locator('.club-night-add').click();
    await page.locator('.p-dropdown-item').first().click();
    await expect(page.locator('.club-night-chip')).toHaveCount(4);
    await expect(page.getByText('A club game: it counts for the statistics, badges and levels of the club.')).toBeVisible();
    await page.screenshot({ path: `test-results/club-night-${test.info().project.name}.png`, fullPage: true });

    // the next game is a club game; back on the evening it is listed (other checks may have played tonight too)
    const before = await page.locator('.timeline-entry').count();
    await page.getByRole('button', { name: 'Start the game' }).click();
    await expect(page).toHaveURL(/\/x01\/g\d+$/);
    await page.goBack();
    await expect(page.locator('.timeline-entry')).toHaveCount(before + 1);
});
