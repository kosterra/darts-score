import { test, expect } from '@playwright/test';

// "Your year in darts": the look back at the year, and its picture to share (saved where
// the browser has no share menu for pictures).
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('your year in darts, and its picture', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/year');

    await expect(page.locator('.kpi-headline').first()).toContainText('214');
    await expect(page.getByText('Your rival of the year')).toBeVisible();
    await expect(page.locator('.year-badges li')).toHaveCount(2);
    await page.screenshot({ path: `test-results/year-${test.info().project.name}.png`, fullPage: true });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Share' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^legmate-\d{4}-.+\.png$/);
    await file.saveAs(`test-results/year-card-${test.info().project.name}.png`);

    // an earlier year without games says so
    await page.goto(`/year?year=${new Date().getFullYear() - 5}`);
    await expect(page.getByText(/No finished game in \d{4} yet\./)).toBeVisible();
});
