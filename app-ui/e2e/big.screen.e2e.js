import { test, expect } from '@playwright/test';

// The big screen: the scorer opens its link from the game; a second browser (the TV) follows
// the game without logging in, and a 180 there is celebrated and called.
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.skip(({ isMobile }) => isMobile, 'the TV is a second browser of its own');

test('a TV follows the game through the link of the big screen', async ({ page, browser }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('oche.x01Input', 'keypad');
    });
    await page.goto('/x01');
    const picker = page.locator('.player-picker');
    // the players of the last game are chosen once the list has loaded: wait for that first
    await expect(picker.locator('.player-pick-card').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await picker.locator('.player-pick-card.is-chosen').count()) await picker.locator('.player-pick-card.is-chosen').first().click();
    await picker.locator('.player-pick-card', { hasText: 'Anna' }).click();
    await picker.locator('.player-pick-card', { hasText: 'Ben' }).click();
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page).toHaveURL(/\/x01\/[^/]+$/);

    await page.getByRole('button', { name: 'Big screen' }).click();
    const link = await page.getByRole('textbox', { name: 'Link for the big screen' }).inputValue();
    expect(link).toMatch(/\/screen\/screen-token-for-/);
    await expect(page.getByRole('img', { name: 'QR code of the link for the big screen' })).toBeVisible();
    await page.keyboard.press('Escape');

    // the TV: another browser, not logged in, the sound recorded instead of played
    const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const tv = await tvContext.newPage();
    await tv.addInitScript(() => {
        localStorage.setItem('darts-score.caller', 'on');
        window.spoken = [];
        window.speechSynthesis.speak = (utterance) => window.spoken.push(utterance.text);
        window.speechSynthesis.cancel = () => {};
    });
    await post('/__test/logged-out', { loggedOut: true });
    await tv.goto(new URL(link).pathname);
    await expect(tv.locator('.big-player')).toHaveCount(2);
    await expect(tv.locator('.big-player-score')).toHaveText(['501', '501']);
    await expect(tv.locator('.big-player.is-turn .big-player-name')).toHaveText('Anna');
    await post('/__test/logged-out', { loggedOut: false });

    for (let dart = 0; dart < 3; dart++) {
        await page.getByRole('radio', { name: 'Treble' }).click();
        await page.getByRole('button', { name: 'Treble 20', exact: true }).click();
    }
    const send = page.getByRole('button', { name: /^(OK|Send|Enter|Next)/ });
    if (await send.count()) await send.first().click();

    await expect(tv.locator('.big-player-score')).toHaveText(['321', '501'], { timeout: 10000 });
    await expect(tv.locator('.big-player.is-turn .big-player-name')).toHaveText('Ben');
    await expect(tv.locator('.one-eighty')).toBeVisible();
    await expect.poll(() => tv.evaluate(() => window.spoken)).toEqual(expect.arrayContaining(['One hundred', 'and', 'eighty!']));
    // after the celebration: the figures of the leg
    await expect(tv.locator('.one-eighty')).toHaveCount(0, { timeout: 10000 });
    await expect(tv.locator('.big-player').first().locator('.big-player-figures dd')).toHaveText(['180.0', '180', '3']);
    await tv.screenshot({ path: 'test-results/big-screen-tv.png' });
    await tvContext.close();
});

test('a TV opened at /tv shows its code, then the game sent to it', async ({ page, browser }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    // the TV: its own browser, not logged in
    const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const tv = await tvContext.newPage();
    await tv.goto('/tv');
    const code = (await tv.locator('.tv-code').innerText()).replace(/\D/g, '');
    expect(code).toMatch(/^\d{6}$/);
    await tv.screenshot({ path: 'test-results/tv-waiting.png' });

    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/x01');
    const picker = page.locator('.player-picker');
    await expect(picker.locator('.player-pick-card').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await picker.locator('.player-pick-card.is-chosen').count()) await picker.locator('.player-pick-card.is-chosen').first().click();
    await picker.locator('.player-pick-card', { hasText: 'Cleo' }).click();
    await picker.locator('.player-pick-card', { hasText: 'Dario' }).click();
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page).toHaveURL(/\/x01\/[^/]+$/);

    await page.getByRole('button', { name: 'Big screen' }).click();
    await page.getByRole('textbox', { name: 'The code of the TV' }).fill('999999');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('.p-inline-message-error')).toContainText('No TV shows this code');
    await page.getByRole('textbox', { name: 'The code of the TV' }).fill(code);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('.p-inline-message-success')).toContainText(code);

    await expect(tv.locator('.big-player-name')).toHaveText(['Cleo', 'Dario'], { timeout: 10000 });
    await expect(tv.locator('.tv-corner-code')).toContainText(code);
    await tvContext.close();
});

