import { test, expect, MOCK } from './fixtures.js';

// The trainings with their own buttons (Treble practice, Bull practice) count every dart at
// once, and Shortest leg says what is left until a finish is in reach.
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
    // saved once confirmed: the buttons of the darts make way for it
    await expect(page.locator('.rules-hitmiss')).toHaveCount(0);
    const save = page.getByRole('button', { name: 'Save the result' });
    await expect(save).toBeInViewport();
    await save.click();
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

test('121 Checkout: a scoreboard per attempts and darts, the same score sharing a place', async ({ page }) => {
    await post('/__test/rules-trainings', {});
    const save = (player, score, settings, day) => post('/api/training/rules', { kind: 'checkout121', player: { id: player }, score, settings, createdAt: new Date(Date.UTC(2026, 9, day, 18)).toISOString() });
    // 10 attempts: two at 128 (one saved before the settings), one at 125; 30 attempts: 141; 6 darts: 124
    await save('p1', 128, { attempts: 10, darts: 9 }, 1);
    await save('p2', 128, {}, 2);
    await save('p3', 125, { attempts: 10, darts: 9 }, 3);
    await save('p1', 141, { attempts: 30, darts: 9 }, 4);
    await save('p2', 124, { attempts: 10, darts: 6 }, 5);
    await page.goto('/training/checkout121');
    await page.waitForLoadState('networkidle');

    const filters = page.locator('.rules-board-filters');
    await expect(filters.getByText('Attempts', { exact: true })).toBeVisible();
    const rows = page.locator('.atc-rows .atc-row');
    // the setup's settings first (10 attempts, 9 darts): the two at 128 both first, the next third
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('.badge-gold')).toHaveCount(1);
    await expect(rows.nth(1).locator('.badge-gold')).toHaveCount(1);
    await expect(rows.nth(2).locator('.badge-bronze')).toHaveCount(1);
    await expect(page.locator('.atc-rows')).not.toContainText('141');

    await filters.getByText('30', { exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('141');
    // the board picked here is what the next training is set up for
    if (!(await page.locator('.player-pick-card.is-chosen').count())) await page.locator('.player-pick-card').first().click();
    await expect(page.locator('.game-setup-summary')).toContainText('30 attempts');
    // nothing with 30 attempts and six darts
    await filters.getByText('6', { exact: true }).click();
    await expect(page.getByText('Nobody has played it with these settings yet.')).toBeVisible();
    await filters.getByText('10', { exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('124');
    await post('/__test/rules-trainings', {});
});

test('the last darts stay in view once a visit is over, to check the last one', async ({ page }) => {
    await start(page, 'trebles');
    await tap(page, 'Treble');
    await tap(page, 'Single');
    await tap(page, 'Miss');
    // the tiles of the visit are empty again; its darts are under them
    const last = page.locator('.rules-last-darts');
    await expect(last).toContainText('Last darts');
    await expect(last.locator('.rules-last-dart')).toHaveText(['Treble', 'Single', 'Miss']);
    await tap(page, 'Double');
    await expect(last.locator('.rules-last-dart')).toHaveText(['Treble', 'Single', 'Miss']);
    await page.screenshot({ path: `test-results/last-darts-${test.info().project.name}.png` });
});
