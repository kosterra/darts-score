import { test, expect, MOCK } from './fixtures.js';

// A training card on a player's statistics opens every attempt over time: the attempts,
// the best and the latest against the first, with the results and the best so far as lines.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
});

test('Doubles around the board over time: fewer darts later count as progress', async ({ page }) => {
    // the mock keeps the trainings of every test: a kind of its own for this one
    const scores = [48, 44, 40, 30];
    for (const [i, score] of scores.entries()) await post('/api/training/rules', { kind: 'doublesaround', player: { id: 'p1' }, score, createdAt: new Date(Date.UTC(2026, 9, 1 + i * 3, 18)).toISOString() });
    await page.goto('/players/p1');
    const card = page.locator('button.training-card').filter({ hasText: 'Doubles around the board' });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const dialog = page.locator('.training-trend-dialog');
    await expect(dialog.locator('.recharts-line')).toHaveCount(2);
    await expect(dialog.locator('.kpi-hero').nth(1)).toContainText('Best');
    // the two last against the two first: 46 darts down to 35, 11 better
    await expect(dialog.locator('.kpi-hero').nth(2)).toContainText('+11');
    await expect(dialog).toContainText('the axis is upside down');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
});
