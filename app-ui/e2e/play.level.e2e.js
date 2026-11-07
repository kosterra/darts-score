import { test, expect, MOCK } from './fixtures.js';

// The level a game was played at, as an estimate under every player of the result:
// an X01 quick game, one player at about a world-class average, the other at a hobby player's.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const v = (player, ...darts) => ({ player, darts });

test('an X01 result says the level every player played at, and what it was judged by', async ({ page }) => {
    const visits = [];
    // 85 a visit and 76 out in 17 darts (83.5), against 26 a visit
    for (let i = 0; i < 5; i++) visits.push(v('q1', 'T20', 'S20', 'S5'), v('q2', 'S20', 'S5', 'S1'));
    visits.push(v('q1', 'T20', 'D8'));
    const game = {
        players: ['q1', 'q2'], quickPlayers: [{ id: 'q1', nickname: 'Pris' }, { id: 'q2', nickname: 'Patch Panther' }],
        startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1, visits,
    };
    const { game: created } = await (await post('/api/public/quick-games', { kind: 'x01', game })).json();
    await page.addInitScript(([id]) => localStorage.setItem('darts-score.quickGames', JSON.stringify({ [id]: { key: 'mock-key', at: Date.now() } })), [created.id]);
    await page.goto(`/quick/stats/x01/${created.id}`);

    const players = page.locator('.result-hero-player');
    await expect(players.nth(0).locator('.play-level-tag')).toContainText('≈ World class');
    await expect(players.nth(0).locator('.play-level-tag')).toHaveAttribute('title', 'Played at about World class level, judged by the 3-dart average (83.5).');
    await expect(players.nth(1).locator('.play-level-tag')).toContainText('≈ Hobby');
});

// The games list: the level after every player's result, and the filter by it, asked of the server
// (the games of anyone at the level, or of the player the list is filtered to)
test('the games list shows the level each played at and filters by it', async ({ page }, testInfo) => {
    await post('/__test/levels');
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/games');
    const rows = page.locator('.games-table tbody tr');
    const row = (nickname, other) => rows.filter({ hasText: nickname }).filter({ hasText: other });
    // gl1: Anna (100 a visit, elite) against Ben (15 a visit, beginner)
    const first = row('Anna', 'Ben').filter({ has: page.locator('.play-level-tag') }).first();
    await expect(first.locator('.play-level-tag > [aria-hidden]')).toHaveText(['Elite', 'Beginner']);
    await expect(first.locator('.play-level-tag').first()).toHaveAttribute('title', 'Played at about Elite level: an estimate from this result alone.');

    const asked = page.waitForRequest(request => request.url().includes('/api/games/x01?level=worldClass'));
    if (testInfo.project.name === 'phone') {
        await page.getByRole('button', { name: 'Filters' }).click();
        await page.locator('.filter-dropdown', { hasText: 'Level:' }).click();
        await page.getByRole('option', { name: 'World class' }).click();
    } else {
        // a compact dropdown on a wide screen too, beside the other filters
        await page.locator('.filter-dropdown.is-compact').click();
        await page.getByRole('option', { name: 'World class' }).click();
    }
    await asked;
    await expect(page).toHaveURL(/level=worldClass/);
    // only gl2, where Cleo played at about world-class level (81 a visit)
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Cleo');

    // filtered to Anna: the games where Anna played at that level
    await page.goto('/games?level=pro&player=p1');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Cleo');
    await page.goto('/games?level=elite&player=p1');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.play-level-tag > [aria-hidden]')).toHaveText(['Elite', 'Beginner']);
});
