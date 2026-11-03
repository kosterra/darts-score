import { test, expect } from '@playwright/test';

// The club rating: the Strongest widget on My club, a player's rating in their header with the
// chart, the chance in a sentence in the comparison, and the favourite's chance on a bracket match.
const MOCK = process.env.MOCK_URL ?? 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
});

test('My club shows the strongest by the club rating', async ({ page }) => {
    // the club arranged its page with the widget (without changing the mock's club for the other tests)
    await page.route('**/api/clubs', async (route) => {
        const clubs = await (await route.fetch()).json();
        await route.fulfill({ json: clubs.map(club => (club.id === 'c1' ? { ...club, dashboardLayout: [{ id: 'leaderRating', size: 'S' }, { id: 'leaderMostWins', size: 'S' }] } : club)) });
    });
    await page.goto('/club');
    const widget = page.locator('.dashboard-widget', { hasText: 'Strongest' });
    await expect(widget.locator('.leaderboard-row')).toHaveCount(5);
    // the strongest first, in points; the one still settling is not on it
    await expect(widget.locator('.leaderboard-row').first()).toContainText('Ben');
    await expect(widget.locator('.leaderboard-row').first()).toContainText('points');
    await expect(widget).not.toContainText('Finn');
    await widget.screenshot({ path: `test-results/rating-widget-${test.info().project.name}.png` });
});

test('a player\'s header shows the club rating, and the chart its history', async ({ page }) => {
    await page.goto('/players/p1');
    const fact = page.locator('.hero-facts div', { hasText: 'Club rating' });
    await expect(fact.locator('dd')).toContainText('2 of 5');
    const chart = page.locator('.rating-trend-chart');
    await expect(chart.locator('.recharts-line')).toBeVisible();
    await expect(chart.locator('.rating-changes li')).toHaveCount(5);
    await expect(chart.locator('.rating-changes li').first()).toContainText('against');
    await chart.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/rating-player-${test.info().project.name}.png`, fullPage: true });
    // all clubs: the rating still counts this club's games, and says so
    await page.goto('/players/p1?scope=all');
    await expect(fact).toContainText("The club rating always counts this club's games.");

    // a player with two games is still settling
    await page.goto('/players/p6');
    await expect(page.locator('.hero-facts div', { hasText: 'Club rating' }).locator('dd')).toContainText('still settling (2 of 5 games)');
});

test('the comparison of two says who wins how often', async ({ page }) => {
    await page.goto('/stats/players?players=p1,p2');
    await expect(page.locator('.duel-chances-sentence')).toHaveText(/^(Anna|Ben) wins \d+ % against (Anna|Ben)$/);
    await page.locator('.duel-chances').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/rating-compare-${test.info().project.name}.png` });
});

test('a match still to be played shows the favourite\'s chance', async ({ page, isMobile }) => {
    await post('/__test/tournaments', { scenario: 'running' });
    const { tournaments } = await (await fetch(`${MOCK}/api/tournaments`)).json();
    const running = tournaments.find(entry => entry.status === 'running');
    const ready = running.matches.find(match => match.status === 'ready' && match.chances);
    expect(Object.values(ready.chances).reduce((sum, value) => sum + value, 0)).toBe(100);
    await page.goto(`/tournaments/${running.id}`);
    // on a phone one round at a time: the semi-final waits to be played
    if (isMobile) await page.getByRole('button', { name: 'Semi-finals' }).click();
    const chance = page.locator('.bracket-chance:visible').first();
    await expect(chance).toBeVisible();
    await expect(chance).toHaveText(/^\d+ %$/);
    await expect(chance).toHaveAttribute('title', 'Chance to win');
    // the bracket fits a phone without scrolling sideways
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/rating-bracket-${test.info().project.name}.png`, fullPage: true });
});
