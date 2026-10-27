import { test, expect } from '@playwright/test';

// The calendar of the club: the club nights with who comes, those cancelled, the days of
// tournaments and leagues; the admins set the nights and cancel one; the link for the phone.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('the club nights, who comes, and the days of tournaments and leagues', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await post('/__test/calendar', { scenario: 'nights' });
    await post('/__test/leagues', { scenario: 'running' });
    await post('/__test/tournaments', { scenario: 'registration' });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/calendar');

    // the first Tuesday: two coming; the next one cancelled with its reason
    const nights = page.locator('.calendar-item.is-night');
    const tuesday = nights.filter({ hasText: 'Back room of the Red Lion' }).first();
    await expect(tuesday).toContainText('2 coming');
    await expect(tuesday).toContainText('1 not coming');
    await expect(page.locator('.calendar-item.is-cancelled').first()).toContainText('The room is taken');
    // the league's matchdays and the end of the registration show by themselves
    await expect(page.locator('.calendar-item.is-event', { hasText: 'Winter League' }).first()).toContainText('Matchday');
    await expect(page.locator('.calendar-item.is-event', { hasText: 'Autumn Cup' }).first()).toContainText('Registration ends');
    await page.screenshot({ path: `test-results/calendar-${test.info().project.name}.png`, fullPage: true });

    // coming: counted at once
    await tuesday.getByRole('button', { name: 'I\'m coming' }).click();
    await expect(tuesday).toContainText('3 coming');
    await tuesday.locator('.calendar-coming').click();
    await expect(tuesday).toContainText('Not coming: ');

    // an admin cancels a Friday
    const friday = nights.filter({ hasNotText: 'Back room' }).first();
    await friday.getByRole('button', { name: 'Cancel this club night' }).click();
    await page.locator('#calendar-reason').fill('Darts final on TV');
    await page.getByRole('button', { name: 'Cancel the club night' }).click();
    await expect(page.locator('.calendar-item.is-cancelled', { hasText: 'Darts final on TV' })).toBeVisible();

    // a third club night a week
    await page.getByRole('button', { name: 'Add a club night' }).click();
    await expect(page.locator('.calendar-night-row')).toHaveCount(3);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('The club nights are saved.')).toBeVisible();

    // the link for the calendar of the phone
    await page.getByRole('button', { name: 'Show my calendar link' }).click();
    await expect(page.getByLabel('Calendar link')).toHaveValue(/\/api\/calendar-feed\/a{48}\.ics$/);
    await expect(page.getByRole('link', { name: 'Add to my calendar' })).toHaveAttribute('href', /^webcal:/);
});
