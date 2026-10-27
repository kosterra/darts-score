import { test, expect } from '@playwright/test';

// The notifications page: all of them cleared at once, after asking.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('clears all notifications after asking', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await post('/__test/notifications');
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/notifications');
    await expect(page.locator('li.notification')).toHaveCount(2);

    await page.getByRole('button', { name: 'Clear all notifications' }).click();
    await expect(page.getByText('Are you sure you want to delete all 2 notifications?')).toBeVisible();
    await page.getByRole('button', { name: 'Sure!' }).click();
    await expect(page.locator('li.notification')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0);

    // the API forgot them too
    await page.reload();
    await expect(page.getByText(/^No notifications\./)).toBeVisible();
});
