import { test, expect } from '@playwright/test';

// Bob's 27: the double to throw at as the big figure with the strip of all doubles, the
// three darts of the visit as hit or miss, an undo that says where it stands, and at the
// end what every double took, with the scoreboard brought into view.
const MOCK = process.env.MOCK_URL ?? 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await post('/__test/rules-trainings', { scenario: 'bobs27' });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
});

test.afterAll(async () => {
    await post('/__test/rules-trainings', {});
});

const startTraining = async (page) => {
    await page.goto('/training/bobs27');
    const cards = page.locator('.player-pick-card');
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    if (!(await page.locator('.player-pick-card.is-chosen').count())) await cards.first().click();
    await page.getByRole('button', { name: 'Start training' }).click();
};

const hero = (page) => page.locator('.result-hero-score');
const slots = (page) => page.locator('.rules-visit-dart');
const current = (page) => page.locator('.rules-double.is-current .rules-double-name');

test('the double to throw at, the darts of the visit and an undo', async ({ page, isMobile }) => {
    test.skip(isMobile, 'once is enough: the darts count the same at every width (the end is checked on a phone too)');
    await startTraining(page);
    const hit = page.getByRole('button', { name: 'Hit', exact: true });
    const miss = page.getByRole('button', { name: 'Miss', exact: true });

    await expect(hero(page)).toHaveText('D1');
    await expect(current(page)).toHaveText('1');
    await expect(slots(page).nth(0)).toHaveClass(/is-next/);

    await hit.click();
    await miss.click();
    await expect(slots(page).nth(0)).toHaveClass(/is-hit/);
    await expect(slots(page).nth(1)).toHaveClass(/is-miss/);
    await expect(slots(page).nth(2)).toHaveClass(/is-next/);
    await expect(page.locator('.rules-status')).toContainText('3 / 3');

    // the third dart ends the visit: the next double, D1 with its hit in the strip
    await hit.click();
    await expect(hero(page)).toHaveText('D2');
    await expect(current(page)).toHaveText('2');
    await expect(page.locator('.rules-double').first()).toContainText('2');
    await expect(page.locator('.rules-double').first()).toHaveClass(/is-tone-2/);
    await expect(slots(page).nth(0)).toHaveClass(/is-next/);
    await expect(page.locator('.x01-live-route')).toHaveText('31 points');

    // undo goes back into the visit of D1 and says so
    await page.getByRole('button', { name: 'Undo dart' }).click();
    await expect(hero(page)).toHaveText('D1');
    await expect(current(page)).toHaveText('1');
    await expect(slots(page).nth(2)).toHaveClass(/is-next/);
    await expect(slots(page).nth(1)).toHaveClass(/is-miss/);
    await expect(page.locator('.rules-undone')).toHaveText('Dart 3 undone: D1 again');
    await expect(page.locator('.x01-live-route')).toHaveText('29 points');

    await page.getByRole('button', { name: 'Undo dart' }).click();
    await expect(slots(page).nth(1)).toHaveClass(/is-next/);
    await expect(page.locator('.rules-undone')).toHaveText('Dart 2 undone: D1 again');

    // a new dart: the note goes
    await hit.click();
    await expect(page.locator('.rules-undone')).toHaveCount(0);
    await expect(slots(page).nth(1)).toHaveClass(/is-hit/);
});

test('at the end what every double took, and the new entry on the scoreboard in view', async ({ page }) => {
    await startTraining(page);
    // five visits without a hit: 27 − 2 − 4 − 6 − 8 − 10 is below 0, the training is over
    const miss = page.getByRole('button', { name: 'Miss', exact: true });
    for (let dart = 0; dart < 15; dart++) await miss.click();

    const summary = page.locator('.result-hero .rules-doubles');
    await expect(summary).toBeVisible();
    await expect(summary.locator('.rules-double.is-tone-0')).toHaveCount(5);
    await expect(summary.locator('.rules-double.is-open')).toHaveCount(16);

    // the attempt just saved lands at its place, in view (on a phone the board is scrolled to)
    const latest = page.locator('.atc-row.is-latest');
    await expect(latest).toContainText('New');
    await expect(latest).not.toHaveClass(/is-arriving/, { timeout: 8_000 });
    await expect(latest).toBeInViewport();

    // the latest attempts carry the training's sign; one of them opens to its doubles
    await page.locator('.p-selectbutton').getByText('Recent', { exact: true }).click();
    await expect(page.locator('.atc-row .rules-board-icon').first()).toBeVisible();
    const older = page.locator('.atc-row.is-openable').nth(1);
    await older.click();
    await expect(older).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.rules-board-doubles .rules-double')).toHaveCount(21);
});
