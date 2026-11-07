import { test, expect, MOCK } from './fixtures.js';

// A club night tonight: its club evening with the members who said they come, a club game
// started among them, and the table of the evening.
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
    // added later: when they came, on the club's clock
    await expect(page.locator('.club-night-chip').last()).toContainText(/came at \d{2}:\d{2}/);
    await expect(page.locator('.club-night-chip').first()).not.toContainText('came at');
    await expect(page.getByText('A club game: it counts for the statistics, badges and levels of the club.')).toBeVisible();

    // someone goes home: still on the list, no longer in the next game; then back
    const first = page.locator('.club-night-chip').first();
    const name = (await first.locator('span span').first().textContent()).trim();
    await first.getByRole('button', { name: `${name} went home` }).click();
    await expect(first).toHaveClass(/is-gone/);
    await expect(first).toContainText('went home at');
    await expect(page.locator('.player-picker-grid').getByText(name, { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `test-results/club-night-${test.info().project.name}.png`, fullPage: true });
    await first.getByRole('button', { name: `${name} is back` }).click();
    await expect(page.locator('.player-picker-grid').getByText(name, { exact: true })).toBeVisible();

    // the next game is a club game; back on the evening it is listed (other checks may have played tonight too)
    const before = await page.locator('.timeline-entry').count();
    await page.getByRole('button', { name: 'Start the game' }).click();
    await expect(page).toHaveURL(/\/x01\/g\d+$/);
    await page.goBack();
    await expect(page.locator('.timeline-entry')).toHaveCount(before + 1);
});

test('tonight\'s club night on the dashboard: coming, then the way to the club evening', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await post('/__test/calendar', { scenario: 'tonight' });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/');
    const night = page.locator('.up-next').filter({ hasText: 'Club night tonight' });
    await expect(night).toContainText('3 coming');
    await night.getByRole('button', { name: 'I\'m coming' }).click();
    await expect(night).toContainText('4 coming');
    await night.getByRole('link', { name: 'Club evening' }).click();
    await expect(page).toHaveURL(/\/club-night\/\d{4}-\d{2}-\d{2}$/);
});
