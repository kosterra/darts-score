import { test, expect, MOCK } from './fixtures.js';

// X01 against the bot: its face in the header moves (idle), looks at the board while it throws,
// and shows on a phone too, small beside the player's picture.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
        localStorage.setItem('oche.x01Input', 'board');
    });
});

test('the bot\'s face: idle at the player\'s turn, throwing at its own, on a phone too', async ({ page }) => {
    await page.goto('/training/x01');
    const cards = page.locator('.player-pick-card');
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    if (!(await page.locator('.player-pick-card.is-chosen').count())) await cards.first().click();
    await page.getByRole('button', { name: 'Start training' }).click();

    const face = page.locator('.x01-bot-avatar .bot-face');
    await expect(face).toBeVisible();
    // the player throws first: the bot waits, looking around
    await expect(face).toHaveClass(/is-idle/);
    await page.screenshot({ path: `test-results/bot-face-${test.info().project.name}.png` });

    // a visit of the player: the bot's turn, it looks at the board
    const twenty = page.locator('.dartboard-img [id="S20"]').first();
    for (let dart = 0; dart < 3; dart++) await twenty.click();
    await page.locator('#submitThrows').click();
    await expect(face).toHaveClass(/is-throwing/);
});
