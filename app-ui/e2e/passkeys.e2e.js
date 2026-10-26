import { test, expect } from '@playwright/test';

// Passkeys, with a fingerprint reader of the device simulated by Chrome (it says yes to every
// request): adding one on the profile, then logging in with it, by the button and by the offer
// in the email field. The stand-in for the API keeps the passkeys without checking them; the
// API's own checks are in app-api/src/controllers/passkey.controller.test.js.
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.skip(({ isMobile }) => isMobile, 'once is enough: the device is simulated the same way');

test('a passkey is added on the profile, then logs in, by the button and in the email field', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    // the email field offers no passkey while the button is tried
    await page.addInitScript(() => {
        if (sessionStorage.getItem('noAutofill')) window.PublicKeyCredential.isConditionalMediationAvailable = async () => false;
        localStorage.setItem('darts-score.activeClub', 'c1');
    });

    await page.goto('/profile');
    await page.getByRole('button', { name: /^Add (a|another) passkey$/ }).click();
    await page.fill('#passkey-password', 'secret123');
    await page.getByRole('button', { name: 'Add passkey', exact: true }).click();
    await expect(page.locator('.passkey-row')).toHaveCount(1);

    await post('/__test/logged-out', { loggedOut: true });
    await page.evaluate(() => sessionStorage.setItem('noAutofill', '1'));
    await page.goto('/login');
    await page.getByRole('button', { name: 'Log in with a passkey' }).click();
    await expect(page).not.toHaveURL(/\/login/);

    await post('/__test/logged-out', { loggedOut: true });
    await page.evaluate(() => sessionStorage.removeItem('noAutofill'));
    await page.goto('/login');
    await expect(page).not.toHaveURL(/\/login/);
});
