import { test, expect } from '@playwright/test';

// The club's year: its figures and awards, from My club; an earlier year without games.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('the club\'s year with its awards, and a year without games', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/club');
    await page.getByRole('link', { name: 'The club\'s year' }).click();
    await expect(page).toHaveURL(/\/club\/year$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('The club\'s year');
    await expect(page.getByText('Champion of the year')).toBeVisible();
    await expect(page.getByText('Most club nights')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();

    await page.goto(`/club/year?year=${new Date().getFullYear() - 3}`);
    await expect(page.getByText(/No finished game in \d{4} yet\./)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' })).toHaveCount(0);
});
