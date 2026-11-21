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
    // the curve of the treble rate: its base line from the start, so the header keeps its height
    const rate = page.locator('.rules-hero-rate .rules-progress');
    await expect(rate).toBeVisible();
    const heroHeight = async () => (await page.locator('.x01-live-hero').boundingBox()).height;
    const before = await heroHeight();
    for (const name of ['Treble', 'Single', 'Treble', 'Miss']) await tap(page, name);
    // after every dart a point: 100 %, 50 %, 67 %, 50 %, a stretch of the curve between each two
    await expect(rate.locator('.rules-progress-line')).toHaveCount(3);
    await expect(rate).toHaveAttribute('aria-label', 'Hit rate after every dart');
    expect(Math.abs(await heroHeight() - before)).toBeLessThan(1);
    await page.screenshot({ path: `test-results/trebles-rate-${test.info().project.name}.png` });
    const tiles = page.locator('.rules-hero-figures');
    await expect(tiles).toContainText('2Trebles');
    await expect(tiles).toContainText('50 %Treble rate');
    await expect(tiles).toContainText('4 / 30Darts');
    // the darts of the visit by the names of the buttons
    await expect(page.locator('.rules-visit-dart').first()).toContainText('Miss');
});

test('Treble practice against the usual treble rate: amber below it, green again at it, the usual rate dashed', async ({ page }) => {
    // three earlier attempts of the player at T20, 40 % each
    await post('/__test/rules-trainings', { scenario: 'trebles' });
    await start(page, 'trebles');
    const rate = page.locator('.rules-hero-rate .rules-progress');
    await expect(rate.locator('.rules-progress-reference')).toHaveCount(1);
    // a treble, then misses: 100 %, 50 %, 33 %, 25 % (below the 40 % from the second visit on)
    for (const name of ['Treble', 'Miss', 'Miss', 'Miss']) await tap(page, name);
    await expect(rate).toHaveAttribute('aria-label', 'Hit rate after every dart, your usual rate 40 %');
    await expect(rate.locator('.rules-progress-line.is-warn')).toHaveCount(2);
    // two trebles: 40 %, then 43 %, at and above the usual rate again
    for (const name of ['Treble', 'Treble']) await tap(page, name);
    await expect(rate.locator('.rules-progress-line').last()).toHaveClass(/is-safe/);
    await expect(rate.locator('.rules-progress-line').nth(-2)).toHaveClass(/is-safe/);
    await page.screenshot({ path: `test-results/trebles-usual-${test.info().project.name}.png` });
});

test('Bull practice to its last dart: the hit rate as the result, on the scoreboard', async ({ page }) => {
    test.setTimeout(60_000);
    await start(page, 'bulls');
    for (let dart = 0; dart < 30; dart++) await tap(page, dart % 2 ? 'Miss' : (dart % 4 ? 'Single' : 'Bullseye'));
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

test('Checkout ladder: a finish out of reach takes no more darts, an ended attempt stays until Enter score', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('oche.x01Input', 'keypad'));
    await start(page, 'ladder');
    const keypad = page.locator('.x01-keypad');
    const ring = (name) => keypad.locator('.x01-keypad-rings').getByText(name, { exact: true }).click();
    const key = (name) => keypad.getByRole('button', { name, exact: true }).click();
    const verdict = page.locator('.rules-attempt-verdict');
    const figures = page.locator('.rules-hero-figures').first();
    // 61: a single 1 leaves 60, still a finish with two darts
    await ring('Single');
    await key('Single 1');
    await expect(verdict).toHaveCount(0);
    // a second single 1 leaves 59 with one dart: no checkout left, no third dart
    await key('Single 1');
    await expect(verdict).toHaveText('No checkout left');
    await key('Single 1');
    await expect(page.locator('.rules-visit-dart.is-thrown')).toHaveCount(2);
    // Enter score counts the last dart as a miss: the next attempt, at 61 again (the bottom rung)
    await page.getByRole('button', { name: 'Enter score', exact: true }).click();
    await expect(verdict).toHaveCount(0);
    await expect(figures).toContainText('2 / 20');
    // T15 and D8 check it out; it stays in view, checked out, until Enter score
    await ring('Treble');
    await key('Treble 15');
    await ring('Double');
    await key('Double 8');
    await expect(verdict).toHaveText('Checked out!');
    await expect(figures).toContainText('2 / 20');
    await page.screenshot({ path: `test-results/ladder-checked-out-${test.info().project.name}.png` });
    await page.getByRole('button', { name: 'Enter score', exact: true }).click();
    await expect(figures).toContainText('3 / 20');
    await expect(verdict).toHaveCount(0);
});

test('Catch 40: a finish checked out counts down to 0, and the strip of the 40 finishes shows each in the colour of its points', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('oche.x01Input', 'keypad'));
    await start(page, 'catch40');
    const keypad = page.locator('.x01-keypad');
    const ring = (name) => keypad.locator('.x01-keypad-rings').getByText(name, { exact: true }).click();
    const key = (name) => keypad.getByRole('button', { name, exact: true }).click();
    const enter = () => page.getByRole('button', { name: 'Enter score', exact: true }).click();
    const cell = (finish) => page.locator('.rules-doubles .rules-double').filter({ has: page.locator('.rules-double-name', { hasText: new RegExp(`^${finish}$`) }) });
    await expect(page.locator('.rules-doubles .rules-double')).toHaveCount(40);
    await expect(cell(61)).toHaveClass(/is-current/);
    // 61: T15 and D8, checked out with two darts: 0 left and its 3 points at once, before Enter score
    await ring('Treble');
    await key('Treble 15');
    // darts still to throw in this visit: no Enter score yet
    await expect(page.getByRole('button', { name: 'Enter score', exact: true })).toBeDisabled();
    await ring('Double');
    await key('Double 8');
    await expect(page.locator('.rules-attempt-verdict')).toHaveText('Checked out!');
    await expect(page.getByRole('button', { name: 'Enter score', exact: true })).toBeEnabled();
    await expect(page.locator('.result-hero-score')).toHaveText('0');
    await expect(page.locator('.rules-hero-figures').first()).toContainText('3Points');
    await enter();
    await expect(cell(61)).toHaveClass(/is-tone-3/);
    await expect(cell(61)).toHaveAttribute('title', '61: 3 points');
    // 62: six singles, missed
    await ring('Single');
    for (let visit = 0; visit < 2; visit++) {
        for (let dart = 0; dart < 3; dart++) await key('Single 1');
        await enter();
    }
    await expect(cell(62)).toHaveClass(/is-tone-0/);
    // the finish alone, what it took in its title
    await expect(cell(62).locator('.rules-double-value')).toHaveCount(0);
    await expect(cell(62)).toHaveAttribute('title', '62: Missed');
    await expect(cell(63)).toHaveClass(/is-current/);
    await page.screenshot({ path: `test-results/catch40-strip-${test.info().project.name}.png`, fullPage: true });
});

test('a fourth dart tapped on the board before Enter score says the visit is complete', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('oche.x01Input', 'board'));
    await start(page, 'scoring');
    const twenty = page.locator('.dartboard-img [id="S20"]').first();
    for (let dart = 0; dart < 4; dart++) await twenty.click();
    await expect(page.getByText('No more darts')).toBeVisible();
    await expect(page.locator('.rules-visit-dart.is-thrown')).toHaveCount(3);
});
