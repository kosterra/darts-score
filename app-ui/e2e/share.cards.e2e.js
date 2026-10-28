import { test, expect } from '@playwright/test';

// Share cards: a nine-darter and a high checkout in the statistics of an X01 game, and
// the win of a tournament, as pictures (saved where the browser has no share menu).
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('a nine-darter and a high checkout to share', async ({ page }) => {
    const v = (player, ...darts) => ({ player, darts });
    const game = {
        players: ['q1', 'q2'], quickPlayers: [{ id: 'q1', nickname: 'Pris' }, { id: 'q2', nickname: 'Patch Panther' }],
        startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1,
        // 180, 180, 141: nine darts
        visits: [v('q1', 'T20', 'T20', 'T20'), v('q2', 'S1', 'S1', 'S1'), v('q1', 'T20', 'T20', 'T20'), v('q2', 'S1', 'S1', 'S1'), v('q1', 'T20', 'T19', 'D12')],
    };
    const { game: created } = await (await post('/api/public/quick-games', { kind: 'x01', game })).json();
    await page.addInitScript(([id]) => localStorage.setItem('darts-score.quickGames', JSON.stringify({ [id]: { key: 'mock-key', at: Date.now() } })), [created.id]);
    await page.goto(`/quick/stats/x01/${created.id}`);

    await expect(page.getByRole('button', { name: 'Share the nine-darter' })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Share the 141 checkout' }).click();
    await (await download).saveAs(`test-results/share-checkout-${test.info().project.name}.png`);
    const nine = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Share the nine-darter' }).click();
    await (await nine).saveAs(`test-results/share-nine-${test.info().project.name}.png`);
});

test('the win of a tournament to share', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await post('/__test/tournaments', { scenario: 'finished' });
    const { tournaments } = await (await fetch(`${MOCK}/api/tournaments`)).json();
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto(`/tournaments/${tournaments[0].id}`);
    const download = page.waitForEvent('download');
    await page.locator('.tournament-champion').getByRole('button', { name: 'Share' }).click();
    await (await download).saveAs(`test-results/share-win-${test.info().project.name}.png`);
});
