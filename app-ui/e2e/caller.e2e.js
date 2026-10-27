import { test, expect } from '@playwright/test';

// The caller of X01: switched on in the game, it calls the visit (the 180 in words) and what
// the next player requires. What would be spoken is recorded instead of played.
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.skip(({ isMobile }) => isMobile, 'the calls are the same at every width');

test('the caller says "Game on!", then the score of a visit', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('oche.x01Input', 'keypad');
        window.spoken = [];
        window.speechSynthesis.speak = (utterance) => window.spoken.push(utterance.text);
        window.speechSynthesis.cancel = () => {};
    });

    await page.goto('/x01');
    const picker = page.locator('.player-picker');
    // the cards move when chosen: one at a time, until none is chosen
    // the players of the last game are chosen once the list has loaded: wait for that first
    await expect(picker.locator('.player-pick-card').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await picker.locator('.player-pick-card.is-chosen').count()) await picker.locator('.player-pick-card.is-chosen').first().click();
    await picker.locator('.player-pick-card', { hasText: 'Anna' }).click();
    await picker.locator('.player-pick-card', { hasText: 'Ben' }).click();
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page).toHaveURL(/\/x01\/[^/]+$/);

    await page.getByRole('button', { name: 'Caller' }).click();
    await expect.poll(() => page.evaluate(() => window.spoken)).toEqual(['Game on!']);

    for (let dart = 0; dart < 3; dart++) {
        await page.getByRole('radio', { name: 'Treble' }).click();
        await page.getByRole('button', { name: 'Treble 20', exact: true }).click();
    }
    const send = page.getByRole('button', { name: /^(OK|Send|Enter|Next)/ });
    if (await send.count()) await send.first().click();
    await expect.poll(() => page.evaluate(() => window.spoken)).toEqual(expect.arrayContaining(['One hundred', 'and', 'eighty!']));
});
