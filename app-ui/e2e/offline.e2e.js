import { test, expect } from '@playwright/test';

// Scoring without a connection: the game goes on, is kept on the device and
// is sent once the connection is back.
const MOCK = 'http://localhost:3901';
const post = (path, body) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const visit = async (page, ring, number) => {
    for (let dart = 0; dart < 3; dart++) {
        await page.getByRole('radio', { name: ring }).click();
        await page.getByRole('button', { name: `${ring} ${number}`, exact: true }).click();
    }
    const send = page.getByRole('button', { name: /^(OK|Send|Enter|Next)/ });
    if (await send.count()) await send.first().click();
};

test('an X01 game is scored on without a connection and sent when it is back', async ({ page, context }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('oche.x01Input', 'keypad');
    });
    await page.goto('/x01');
    const picker = page.locator('.player-picker');
    await expect(picker.locator('.player-pick-card').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await picker.locator('.player-pick-card.is-chosen').count()) await picker.locator('.player-pick-card.is-chosen').first().click();
    await picker.locator('.player-pick-card', { hasText: 'Anna' }).click();
    await picker.locator('.player-pick-card', { hasText: 'Ben' }).click();
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page).toHaveURL(/\/x01\/[^/]+$/);
    const id = page.url().split('/').pop();
    const visitsOnServer = async () => (await (await fetch(`${MOCK}/api/games/x01/${id}`)).json()).visits?.length ?? 0;

    await visit(page, 'Single', 20);
    await expect.poll(visitsOnServer).toBe(1);

    // the connection drops: scoring goes on, kept on the device
    await context.setOffline(true);
    await visit(page, 'Single', 19);
    await expect(page.locator('.save-status')).toContainText('No connection');
    await visit(page, 'Single', 18);
    await expect(page.locator('.x01-hero-player .result-hero-score')).toHaveText(['387', '444']);
    expect(await visitsOnServer()).toBe(1);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('darts-score.unsent-games')));
    expect(Object.values(kept)[0].game.visits).toHaveLength(3);
    await page.screenshot({ path: 'test-results/offline-scoring.png' });

    // back: everything is sent, nothing is kept any more
    await context.setOffline(false);
    await expect(page.locator('.save-status')).toHaveCount(0, { timeout: 15000 });
    expect(await visitsOnServer()).toBe(3);
    expect(await page.evaluate(() => localStorage.getItem('darts-score.unsent-games'))).toBeNull();
});

test('a game kept on the device is opened from the note and sent', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    // a game of an earlier visit to the page, its last visit not sent
    const created = await (await post('/api/games/x01', { players: ['p1', 'p2'] })).json();
    await page.addInitScript((id) => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        if (!sessionStorage.getItem('seeded')) {
            sessionStorage.setItem('seeded', '1');
            localStorage.setItem('darts-score.unsent-games', JSON.stringify({ [`x01:${id}`]: { game: { id, visits: [1] }, players: [{ id: 'p1', nickname: 'Anna' }, { id: 'p2', nickname: 'Ben' }], link: `/x01/${id}`, kind: 'X01', at: Date.now() } }));
        }
    }, created.id);
    await page.goto('/players');
    const note = page.locator('.unsent-games');
    await expect(note).toContainText('A game is not sent yet');
    await expect(note).toContainText('Anna, Ben');
    await page.screenshot({ path: 'test-results/offline-note.png' });

    // opening it sends it: the note is gone
    await page.route(`**/api/games/x01/${created.id}`, route => route.request().method() === 'GET' ? route.fulfill({ status: 503 }) : route.continue());
    await note.getByRole('button', { name: 'Open and send' }).click();
    await expect.poll(async () => (await (await fetch(`${MOCK}/api/games/x01/${created.id}`)).json()).visits).toEqual([1]);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('darts-score.unsent-games'))).toBeNull();
});
