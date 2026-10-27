import { test, expect } from '@playwright/test';

// X01 doubles: four players in two teams who share their score, the teams and partners taking turns.
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

test('a doubles game: set up in teams, the team\'s score shared', async ({ page, isMobile }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('oche.x01Input', 'keypad');
        localStorage.removeItem('darts-score.setup.x01');
    });
    await page.goto('/x01');
    const picker = page.locator('.player-picker');
    await expect(picker.locator('.player-pick-card').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await picker.locator('.player-pick-card.is-chosen').count()) await picker.locator('.player-pick-card.is-chosen').first().click();
    for (const name of ['Anna', 'Ben', 'Cleo', 'Dario']) await picker.locator('.player-pick-card', { hasText: name }).click();

    // four players: doubles can be chosen; the teams follow the throwing order (first and third
    // against second and fourth), other partners with a button that changes the order
    await page.getByRole('button', { name: 'Doubles', exact: true }).click();
    const teams = page.locator('.doubles-team');
    await expect(teams).toHaveText([/Anna & Cleo/, /Ben & Dario/]);
    await page.getByRole('button', { name: 'Change partners' }).click();
    await expect(teams).toHaveText([/Anna & Dario/, /Cleo & Ben/]);
    await page.getByRole('button', { name: 'Change partners' }).click();
    await expect(teams).toHaveText([/Anna & Ben/, /Dario & Cleo/]);
    await page.getByRole('button', { name: 'Change partners' }).click();
    await expect(teams).toHaveText([/Anna & Cleo/, /Ben & Dario/]);
    await page.locator('.doubles-teams').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/doubles-setup.png' });

    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page).toHaveURL(/\/x01\/[^/]+$/);
    const id = page.url().split('/').pop();
    const stored = await (await fetch(`${MOCK}/api/games/x01/${id}`)).json();
    expect(stored.doubles).toBe(true);
    expect(stored.players).toEqual(['p1', 'p2', 'p3', 'p4']);

    // two teams on top: the one who throws next for each, the partner beside
    const sides = page.locator('.x01-hero-player');
    await expect(sides).toHaveCount(2);
    await expect(sides.nth(0).locator('.x01-hero-name')).toHaveText('Anna');
    await expect(sides.nth(0).locator('.x01-hero-partner')).toHaveText('with Cleo');
    await expect(sides.nth(1).locator('.x01-hero-name')).toHaveText('Ben');

    await visit(page, 'Single', 20);
    await visit(page, 'Single', 19);
    // Cleo throws next for the team, from what Anna left
    await expect(sides.nth(0).locator('.x01-hero-name')).toHaveText('Cleo');
    await expect(sides.locator('.result-hero-score')).toHaveText(['441', '444']);
    await visit(page, 'Treble', 20);
    await expect(sides.locator('.result-hero-score')).toHaveText(['261', '444']);
    await expect(sides.nth(1)).toHaveClass(/is-turn/);
    await expect(sides.nth(1).locator('.x01-hero-name')).toHaveText('Dario');
    await page.locator('.x01-live-hero').screenshot({ path: 'test-results/doubles-game.png' });
    if (isMobile) return;

    // the big screen: the two teams, as on top of the game
    await page.getByRole('button', { name: 'Big screen' }).click();
    const link = await page.getByRole('textbox', { name: 'Link for the big screen' }).inputValue();
    await page.keyboard.press('Escape');
    const tv = await page.context().newPage();
    await tv.setViewportSize({ width: 1920, height: 1080 });
    await tv.goto(new URL(link).pathname);
    await expect(tv.locator('.big-player')).toHaveCount(2);
    await expect(tv.locator('.big-player-score')).toHaveText(['261', '444']);
    await expect(tv.locator('.big-player-partner')).toHaveText(['with Cleo', 'with Ben']);
    await expect(tv.locator('.big-player.is-turn .big-player-name')).toHaveText('Dario');
    await tv.screenshot({ path: 'test-results/doubles-tv.png' });
    await tv.close();
});
