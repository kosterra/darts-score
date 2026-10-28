import { test, expect } from '@playwright/test';

// Leagues: an admin sets one up and starts it, then moves a match and a matchday and
// decides a match; the table counts it.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
});

test('an admin sets up a league and starts it', async ({ page }) => {
    await post('/__test/leagues', { scenario: 'none' });
    await page.goto('/leagues');
    await expect(page.getByText('No league yet: set up the first one.')).toBeVisible();
    await page.getByRole('link', { name: 'New league' }).click();
    await page.locator('#league-name').fill('Spring League');
    await page.locator('.p-multiselect').click();
    const items = page.locator('.p-multiselect-item');
    for (let index = 0; index < 4; index += 1) await items.nth(index).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Twice' }).click();
    await expect(page.locator('.league-plan')).toContainText('4 players: 6 matches each, on 6 matchdays');
    await page.screenshot({ path: `test-results/league-editor-${test.info().project.name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Start the league' }).click();

    await expect(page).toHaveURL(/\/leagues\/l\d+$/);
    await expect(page.locator('.league-table tbody tr')).toHaveCount(4);
    await expect(page.locator('.league-day-nav')).toContainText('Matchday 1 of 6');
    await expect(page.locator('.league-matches').last().locator('.bracket-match')).toHaveCount(2);
});

test('the admins move matches and matchdays and decide matches', async ({ page }) => {
    await post('/__test/leagues', { scenario: 'running' });
    const { leagues } = await (await fetch(`${MOCK}/api/leagues`)).json();
    await page.goto(`/leagues/${leagues[0].id}`);

    // the first matchday is played: the second is the current one, one of five sits out
    await expect(page.locator('.league-day-nav')).toContainText('Matchday 2 of 5');
    await expect(page.getByText('sits out this matchday.')).toBeVisible();
    await expect(page.locator('.league-table tbody tr').first().locator('td').nth(2)).toHaveText('1');
    await page.screenshot({ path: `test-results/league-page-${test.info().project.name}.png`, fullPage: true });

    // a match postponed
    const matches = page.locator('.league-columns .league-matches .bracket-match');
    await matches.first().click();
    const dialog = page.locator('.tournament-dialog');
    await expect(dialog.getByText('Move the match')).toBeVisible();
    // the 15th of next month in the date picker
    await dialog.locator('.p-calendar input').click();
    await page.locator('.p-datepicker-next').click();
    await page.locator('.p-datepicker-calendar td:not(.p-datepicker-other-month) span', { hasText: /^15$/ }).click();
    await dialog.getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.locator('.league-columns .league-match').first()).toContainText('Moved to');
    const moved = (await (await fetch(`${MOCK}/api/leagues/${leagues[0].id}`)).json()).matches.find(match => match.date);
    expect(new Date(moved.date).getDate()).toBe(15);

    // a walkover: counted in the table
    await matches.nth(1).click();
    await dialog.locator('.tournament-decide .p-button').first().click();
    await dialog.getByRole('button', { name: 'Wins' }).click();
    await expect(page.locator('.league-columns .league-matches .bracket-match').nth(1).locator('.is-winner')).toHaveCount(1);

    // the whole matchday moved
    await page.getByRole('button', { name: 'Move the matchday' }).click();
    await expect(page.getByText('Move matchday 2')).toBeVisible();
    await page.locator('.tournament-dialog').getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.locator('.tournament-dialog')).toHaveCount(0);

    // the next matchday
    await page.getByRole('button', { name: 'Later matchday' }).click();
    await expect(page.locator('.league-day-nav')).toContainText('Matchday 3 of 5');
});
