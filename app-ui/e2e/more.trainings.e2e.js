import { test, expect } from '@playwright/test';

// The trainings with their own buttons (Treble practice, Bull practice) count every dart at
// once, and Shortest leg says what is left until a finish is in reach.
const MOCK = process.env.MOCK_URL ?? 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
});

const start = async (page, kind) => {
    await page.goto(`/training/${kind}`);
    const cards = page.locator('.player-pick-card');
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    if (!(await page.locator('.player-pick-card.is-chosen').count())) await cards.first().click();
    await page.getByRole('button', { name: 'Start training' }).click();
};
const tap = (page, name) => page.locator('.rules-hitmiss').getByRole('button', { name, exact: true }).click();

test('Treble practice: Treble, Single, Double and Miss count at once, the trebles on the tiles', async ({ page }) => {
    await start(page, 'trebles');
    await expect(page.locator('.rules-hero-target')).toHaveText('T20');
    for (const name of ['Treble', 'Single', 'Treble', 'Miss']) await tap(page, name);
    const tiles = page.locator('.rules-hero-figures');
    await expect(tiles).toContainText('2Trebles');
    await expect(tiles).toContainText('50 %Treble rate');
    await expect(tiles).toContainText('4 / 30Darts');
    // the darts of the visit by the names of the buttons
    await expect(page.locator('.rules-visit-dart').first()).toContainText('Miss');
});

test('Bull practice to its last dart: the hit rate as the result, on the scoreboard', async ({ page }) => {
    test.setTimeout(60_000);
    await start(page, 'bulls');
    for (let dart = 0; dart < 30; dart++) await tap(page, dart % 2 ? 'Miss' : (dart % 4 ? '25' : 'Bullseye'));
    await expect(page.locator('.result-hero')).toContainText('50');
    await expect(page.locator('.result-hero')).toContainText('Hit rate');
    await expect(page.locator('.atc-row').filter({ hasText: '50 %' }).first()).toBeVisible();
});

test('Shortest leg: what is left from 501, the way out once a finish is in reach', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('oche.x01Input', 'keypad'));
    await start(page, 'shortleg');
    await expect(page.getByText('501 left')).toBeVisible();
    const keypad = page.locator('.x01-keypad');
    await keypad.locator('.x01-keypad-rings').getByText('Treble', { exact: true }).click();
    await keypad.getByRole('button', { name: 'Treble 20', exact: true }).click();
    await expect(page.locator('.rules-hero-figures')).toContainText('1Darts');
});
