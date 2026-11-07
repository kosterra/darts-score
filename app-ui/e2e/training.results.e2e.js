import { test, expect, MOCK } from './fixtures.js';

// The end of a training on a phone: the result first, then the scoreboard comes into view
// with the new attempt moving up to its place. And while a training is entered with the
// board or the keypad, the darts of the visit float above the menu bar, as in X01.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
});

const choosePlayer = async (page) => {
    const cards = page.locator('.player-pick-card');
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    if (!(await page.locator('.player-pick-card.is-chosen').count())) await cards.first().click();
};

test('Around the Clock with the fewest darts: the result, then the new round in view', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'on a desktop the scoreboard is beside the round');
    test.setTimeout(90_000);
    await page.goto('/training/atc');
    await choosePlayer(page);
    await page.getByText('Fewest darts', { exact: true }).click();
    await page.getByRole('button', { name: 'Start training' }).click();
    await page.getByRole('button', { name: 'Start round' }).click();
    await expect(page.getByRole('button', { name: 'Hit', exact: true })).toBeVisible();

    // a perfect round: 21 hits, H on a keyboard
    for (let dart = 0; dart < 21; dart++) await page.keyboard.press('h');

    // the result is seen first, where the round was
    const result = page.locator('.atc-result-card');
    await expect(result).toBeInViewport();
    await expect(result).toContainText('21 darts');
    // the moment of the last dart plays over the scoreboard: the new round waits for it
    await expect(page.locator('.stage-moment')).toBeVisible();
    await expect(page.locator('.atc-row').filter({ hasText: '21 darts' })).toHaveCount(0);

    // then the scoreboard below comes into view, and the new round ends up on it, in view
    const arrived = page.locator('.atc-row.is-latest').filter({ hasText: '21 darts' });
    await expect(arrived).toBeInViewport({ timeout: 15_000 });
    await expect(arrived).toContainText('New');
    await expect(page.locator('.atc-row.is-arriving')).toHaveCount(0, { timeout: 10_000 });
    await expect(arrived).toBeInViewport();
    await expect(page.locator('.atc-result-place')).toContainText('1st');
});

test('Scoring with the keypad and the board: the visit floats above the menu bar on a phone, Enter score enters it', async ({ page, isMobile }) => {
    await page.addInitScript(() => localStorage.setItem('oche.x01Input', 'keypad'));
    await page.goto('/training/scoring');
    await choosePlayer(page);
    await page.getByRole('button', { name: 'Start training' }).click();

    const bar = page.locator('.rules-visit-bar');
    if (!isMobile) {
        // on a desktop the panel of the training is beside the board: no bar
        await expect(page.locator('.x01-keypad')).toBeVisible();
        await expect(bar).toBeHidden();
        return;
    }
    await page.getByRole('radio', { name: 'Treble' }).click();
    await page.getByRole('button', { name: 'Treble 20', exact: true }).click();
    await expect(bar).toBeInViewport();
    await expect(bar.locator('.x01-visit-bar-darts')).toContainText('T20');
    await expect(bar.locator('.x01-visit-total')).toContainText('60');
    // nothing is wider than the phone
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    // Undo in the bar takes the dart back
    await bar.getByRole('button', { name: 'Undo dart' }).click();
    await expect(bar.locator('.x01-visit-bar-darts')).not.toContainText('T20');

    // with the board the same
    await page.locator('.x01-input-switch').getByText('Board').click();
    await page.locator('.dartboard-img [id="S20"]').first().click();
    await expect(bar).toBeInViewport();
    await expect(bar.locator('.x01-visit-bar-darts')).toContainText('S20');

    // Enter score enters the visit (the darts not tapped are misses): the bar is empty again
    const enter = bar.getByRole('button', { name: 'Enter score' });
    await enter.click();
    await expect(bar.locator('.x01-visit-bar-darts')).not.toContainText('S20');
    await expect(enter).toBeDisabled();
    await page.screenshot({ path: `test-results/training-enter-${test.info().project.name}.png` });
});

test('Scoring with the board to its last dart: the training ends there, and its entry is on the scoreboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the logic once, at desktop width');
    await post('/__test/rules-trainings', {});
    await page.addInitScript(() => localStorage.setItem('oche.x01Input', 'board'));
    await page.goto('/training/scoring');
    await choosePlayer(page);
    await page.getByRole('button', { name: 'Start training' }).click();

    // 30 darts in the single 20: nine visits entered, the tenth ends the training
    const twenty = page.locator('.dartboard-img [id="S20"]').first();
    const enter = page.locator('#submitThrows');
    for (let visit = 0; visit < 10; visit++) {
        for (let dart = 0; dart < 3; dart++) await twenty.click();
        if (visit < 9) await enter.click();
    }
    // over, saved only once confirmed: the board makes way for the result's buttons
    await expect(page.locator('.rules-over')).toContainText('Training over');
    await expect(enter).toHaveCount(0);
    await expect(page.locator('.result-hero-score')).toHaveText('60.0');
    // Undo takes the last dart back: one more to throw
    await page.locator('.rules-over').getByRole('button', { name: 'Undo dart' }).click();
    await expect(page.locator('.rules-over')).toHaveCount(0);
    await twenty.click();
    await page.getByRole('button', { name: 'Save the result' }).click();
    await expect(page.getByRole('button', { name: 'Start training' })).toBeVisible();
    const latest = page.locator('.atc-row.is-latest');
    await expect(latest).toBeVisible();
    await expect(latest).toContainText('60.0');
});
