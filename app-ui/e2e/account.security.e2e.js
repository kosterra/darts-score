import { test, expect } from '@playwright/test';

// The account's ways in are guarded on the profile: a new email address asks for
// the current password (and a code when two-step login is on), adding a passkey
// asks for a code when two-step login is on, removing one asks for the password
// inline. The API's own checks are in app-api/test/integration/account.security.test.js.
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
});

test.afterEach(async () => {
    await post('/__test/mfa', { enabled: false });
    await post('/__test/passkeys', { passkeys: [] });
});

test('a new email address asks for the password, and the code once two-step login is on', async ({ page }) => {
    await post('/__test/mfa', { enabled: false });
    await page.goto('/profile');
    const save = page.getByRole('button', { name: 'Save', exact: true });
    await expect(page.locator('#profile-email-password')).toHaveCount(0);

    await page.fill('#profile-email', 'new.address@example.com');
    await expect(page.locator('#profile-email-password')).toBeVisible();
    await expect(page.locator('#profile-email-code')).toHaveCount(0);
    await expect(page.getByText('To change your email address, enter your current password.')).toBeVisible();
    await expect(save).toBeDisabled();
    await page.fill('#profile-email-password', 'secret123');
    await expect(save).toBeEnabled();

    // typed back: nothing to confirm
    await page.fill('#profile-email', 'test@example.com');
    await expect(page.locator('#profile-email-password')).toHaveCount(0);

    await post('/__test/mfa', { enabled: true });
    await page.reload();
    await page.fill('#profile-email', 'new.address@example.com');
    await expect(page.locator('#profile-email-password')).toBeVisible();
    await expect(page.locator('#profile-email-code')).toBeVisible();
    await page.fill('#profile-email-password', 'secret123');
    await expect(save).toBeDisabled();
    await page.fill('#profile-email-code', '123456');
    await expect(save).toBeEnabled();
});

test('a passkey is added with a code when two-step login is on, and removed with the password', async ({ page }) => {
    await post('/__test/mfa', { enabled: true });
    await post('/__test/passkeys', { passkeys: ['iPhone von Reto', 'Linux'] });
    await page.goto('/profile');
    await expect(page.locator('.passkey-row')).toHaveCount(2);

    await page.getByRole('button', { name: 'Add another passkey' }).click();
    await expect(page.locator('#passkey-password')).toBeVisible();
    await expect(page.locator('#passkey-code')).toBeVisible();
    const add = page.getByRole('button', { name: 'Add passkey', exact: true });
    await page.fill('#passkey-password', 'secret123');
    await expect(add).toBeDisabled();
    await page.fill('#passkey-code', '123456');
    await expect(add).toBeEnabled();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#passkey-password')).toHaveCount(0);

    // the bin opens the question for that passkey; removing it takes it off the list
    await page.getByRole('button', { name: 'Remove iPhone von Reto' }).click();
    await expect(page.getByText('Enter your password to remove iPhone von Reto.')).toBeVisible();
    const remove = page.getByRole('button', { name: 'Remove', exact: true });
    await expect(remove).toBeDisabled();
    await page.fill('#passkey-remove-password', 'secret123');
    await remove.click();
    await expect(page.locator('.passkey-row')).toHaveCount(1);
    await expect(page.locator('#passkey-remove-password')).toHaveCount(0);

    // without two-step login the add form asks for the password alone
    await post('/__test/mfa', { enabled: false });
    await page.reload();
    await page.getByRole('button', { name: 'Add another passkey' }).click();
    await expect(page.locator('#passkey-password')).toBeVisible();
    await expect(page.locator('#passkey-code')).toHaveCount(0);
});
