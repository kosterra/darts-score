import { test, expect } from '@playwright/test';

// The level a game was played at, as an estimate under every player of the result:
// an X01 quick game, one player at about a pro's average, the other at a pub player's.
const MOCK = process.env.MOCK_URL ?? 'http://localhost:3901';
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
    await expect(players.nth(0).locator('.play-level-tag')).toContainText('≈ Pro level');
    await expect(players.nth(0).locator('.play-level-tag')).toHaveAttribute('title', 'Played at about pro level, judged by the 3-dart average (83.5).');
    await expect(players.nth(1).locator('.play-level-tag')).toContainText('≈ Pub level');
});
