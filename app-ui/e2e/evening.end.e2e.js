import { test, expect } from '@playwright/test';

// A darts evening ends: by hand from the device that runs it, then no more games, the
// table final and its winner named, also for those who follow it.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('ending a darts evening', async ({ page }) => {
    const { id } = await (await post('/__test/evening', { name: 'Pub night' })).json();
    await page.goto(`/evening/${id}`);

    // going on: the next game, and when it ends by itself
    await expect(page.getByText('Next game')).toBeVisible();
    await expect(page.locator('.evening-end')).toContainText('it ends by itself 12 hours after the last game');
    await page.locator('.evening-end').getByRole('button', { name: 'End the evening' }).click();
    await page.locator('.p-confirm-dialog-accept').click();

    // over: the winner (each won one game, the table decides), and no more games
    await expect(page.locator('.evening-over')).toContainText('The evening is over:');
    await expect(page.locator('.evening-over')).toContainText('wins it!');
    await expect(page.getByText('Next game')).toHaveCount(0);
    await page.screenshot({ path: `test-results/evening-over-${test.info().project.name}.png`, fullPage: true });

    // a new game is refused by the server too
    const refused = await post(`/api/public/evenings/${id}/games`, { kind: 'x01', game: {} });
    expect(refused.status).toBe(409);

    // the shared page says it is over
    const { shareToken } = await (await fetch(`${MOCK}/api/public/evenings/${id}`)).json();
    await page.goto(`/evening/shared/${shareToken}`);
    await expect(page.locator('.evening-over')).toContainText('wins it!');
    await expect(page.getByText('You follow this evening')).toHaveCount(0);
});
