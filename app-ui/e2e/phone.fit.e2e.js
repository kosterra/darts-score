import { test, expect, MOCK } from './fixtures.js';

// On a small phone the board, the keypad or the buttons of a game or a training are fully in view
// above the bars at the bottom, without scrolling: the header gets compact, the input takes the room left.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.skip(({ isMobile }) => !isMobile, 'a phone only: on a desktop the header keeps its size');
test.use({ viewport: { width: 375, height: 667 } });

const INPUT = 'svg.dartboard-img:not(.dartboard-loupe-board), .x01-keypad, .rules-hitmiss, .atc-round-buttons';

// how far the input reaches below the top of the bars at the bottom (positive: hidden), the
// page scrolled to the top; the smallest key; the size of the board
const overflow = (page) => page.evaluate(async (selector) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const shown = (el) => el.getBoundingClientRect().height > 0;
    const input = [...document.querySelectorAll(selector)].find(shown);
    let limit = window.innerHeight;
    document.querySelectorAll('.x01-visit-bar.is-floating, .rules-danger-dock, .app-navigation-bar').forEach(bar => {
        if (shown(bar) && getComputedStyle(bar).position === 'fixed') limit = Math.min(limit, bar.getBoundingClientRect().top);
    });
    const keys = [...input.querySelectorAll('button')].filter(shown).map(key => key.getBoundingClientRect().height);
    return { hidden: Math.round(input.getBoundingClientRect().bottom - limit), key: keys.length ? Math.min(...keys) : null, board: input.matches('svg') ? input.getBoundingClientRect().width : null };
}, INPUT);

const fits = async (page) => {
    await page.locator(INPUT).first().waitFor();
    await expect.poll(async () => (await overflow(page)).hidden, { message: 'the input reaches under the bars by' }).toBeLessThanOrEqual(0);
    const { key, board } = await overflow(page);
    // keys a thumb still hits, a board still big enough to aim at
    if (key !== null) expect(key).toBeGreaterThanOrEqual(40);
    if (board !== null) expect(board).toBeGreaterThanOrEqual(220);
};

const loggedIn = async (page, input) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript((mode) => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
        if (mode) localStorage.setItem('oche.x01Input', mode);
    }, input);
};
const startGame = async (page, path) => {
    await page.goto(path);
    const cards = page.locator('.player-pick-card');
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await page.locator('.player-pick-card.is-chosen').count()) await page.locator('.player-pick-card.is-chosen').first().click();
    // Eva and Finn: the games of Anna and Ben are counted by the list of games (play.level)
    await cards.filter({ hasText: 'Eva' }).click();
    await cards.filter({ hasText: 'Finn' }).click();
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
};
const startTraining = async (page, path) => {
    await page.goto(path);
    const cards = page.locator('.player-pick-card');
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    if (!(await page.locator('.player-pick-card.is-chosen').count())) await cards.first().click();
};

for (const input of ['board', 'keypad']) {
    test(`X01 with the ${input}: in view under a compact header, also after a visit`, async ({ page }) => {
        await loggedIn(page, input);
        await startGame(page, '/x01');
        await fits(page);
        await expect(page.locator('html')).toHaveClass(/input-tight/);
        // the scores stay big
        const score = await page.locator('.x01-hero-player.is-turn .result-hero-score').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
        expect(score).toBeGreaterThanOrEqual(32);
        if (input === 'board') for (let dart = 0; dart < 3; dart++) await page.locator('svg.dartboard-img [id="S20"]').first().click();
        else for (let dart = 0; dart < 3; dart++) await page.locator('.x01-keypad').getByRole('button', { name: 'Single 20', exact: true }).click();
        const send = page.locator('#submitThrows');
        if (await send.isVisible()) await send.click();
        await expect(page.locator('.x01-hero-player').first().locator('.result-hero-score')).toHaveText('441');
        await fits(page);
    });
}

test('Cricket with the board: the marks below it', async ({ page }) => {
    await loggedIn(page, 'board');
    await startGame(page, '/cricket');
    await fits(page);
    // the marks are still on the page, under the board
    const marks = page.locator('.x01-aside-after');
    await expect(marks).toBeVisible();
    expect((await marks.boundingBox()).y).toBeGreaterThan((await page.locator('svg.dartboard-img').first().boundingBox()).y);
});

test('Shanghai with the board: the standings below it', async ({ page }) => {
    await loggedIn(page, 'board');
    await startGame(page, '/play/shanghai');
    await fits(page);
});

test('Random checkouts with the board: the number to check out stays big', async ({ page }) => {
    await loggedIn(page, 'board');
    await startTraining(page, '/training/randomcheckouts');
    await page.getByRole('button', { name: 'Start training' }).click();
    await fits(page);
    const target = await page.locator('.x01-hero-player .result-hero-score').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(target).toBeGreaterThanOrEqual(32);
    await page.screenshot({ path: 'test-results/phone-fit-randomcheckouts.png' });
});

test('Treble practice: its four buttons in view', async ({ page }) => {
    await loggedIn(page);
    await startTraining(page, '/training/trebles');
    await page.getByRole('button', { name: 'Start training' }).click();
    await fits(page);
});

test('Around the Clock training: Hit and Miss in view', async ({ page }) => {
    await loggedIn(page);
    await startTraining(page, '/training/atc');
    await page.getByText('Fewest darts', { exact: true }).click();
    await page.getByRole('button', { name: 'Start training' }).click();
    await page.getByRole('button', { name: 'Start round' }).click();
    await fits(page);
});
