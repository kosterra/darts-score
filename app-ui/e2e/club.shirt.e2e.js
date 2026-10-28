import { test, expect } from '@playwright/test';

// The club shirt: its admins design it (pattern, colours), it shows in the preview, and
// small next to the names in a game.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('the club shirt, designed and worn', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    // a plain shirt to start from (the mock keeps what an earlier run saved)
    await fetch(`${MOCK}/api/clubs/c1/shirt`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pattern: 'plain', color: null, accent: '#f2f2f2', logo: false }) });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto('/my-clubs/c1');

    const editor = page.locator('.club-shirt-editor');
    await editor.getByRole('button', { name: 'Hoops' }).click();
    await editor.getByRole('radiogroup', { name: 'Main colour' }).getByRole('radio').nth(5).click();
    await editor.getByRole('radiogroup', { name: 'Second colour' }).getByRole('radio').nth(2).click();
    await editor.locator('.club-shirt-preview').screenshot({ path: `test-results/club-shirt-${test.info().project.name}.png` });
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('The club shirt is saved.')).toBeVisible();

    // in a game: the shirt small before the name
    const created = await (await post('/api/games/x01', { players: ['p1', 'p2'], startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3, currentPlayerTurn: 'p1', startingPlayerLeg: 'p1', startingPlayerSet: 'p1', gameIsRunning: true, visits: [] })).json();
    await page.goto(`/x01/${created.id}`);
    await expect(page.locator('.x01-hero-name .player-shirt').first()).toBeVisible();
    await page.locator('.x01-hero-player').first().screenshot({ path: `test-results/game-shirt-${test.info().project.name}.png` });
});
