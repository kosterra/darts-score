import { test, expect } from '@playwright/test';

// A darts evening where someone comes later and someone goes home early: the one
// coming is added by name, who went home is no longer chosen for a game but keeps
// their games in the table, and the table can be ordered by win rate.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('players coming later and going home', async ({ page }) => {
    const { id } = await (await post('/__test/evening', { name: 'Pub night', names: ['Anna', 'Ben', 'Cleo'] })).json();
    await page.goto(`/evening/${id}`);
    const here = page.locator('.evening-players');
    const picker = page.locator('.player-picker-grid');

    // Dan comes later
    await here.getByLabel('Name of the player arriving').fill('Dan');
    await here.getByRole('button', { name: 'Add' }).click();
    await expect(here.locator('.evening-player-chip', { hasText: 'Dan' })).toContainText('came at');
    await expect(picker.getByText('Dan')).toBeVisible();
    // he has not played yet, so he is suggested first
    await expect(picker.locator('.player-pick-card.is-chosen', { hasText: 'Dan' })).toBeVisible();

    // Cleo goes home: not to choose any more, her games still in the table
    await here.getByRole('button', { name: 'Cleo went home' }).click();
    await expect(here.locator('.evening-player-chip.is-gone', { hasText: 'Cleo' })).toContainText('went home at');
    await expect(picker.getByText('Cleo')).toHaveCount(0);
    const table = page.locator('.evening-standings');
    await expect(table.locator('li', { hasText: 'Cleo' })).toContainText('went home at');
    await page.screenshot({ path: `test-results/evening-players-${test.info().project.name}.png`, fullPage: true });
    await table.screenshot({ path: `test-results/evening-table-${test.info().project.name}.png` });

    // the table by win rate: who has not played yet last
    await page.getByRole('radio', { name: 'Win rate' }).or(page.getByRole('button', { name: 'Win rate' })).first().click();
    await expect(table.locator('li').last()).toContainText('Dan');

    // Cleo is back
    await here.getByRole('button', { name: 'Cleo is back' }).click();
    await expect(picker.getByText('Cleo')).toBeVisible();
});
