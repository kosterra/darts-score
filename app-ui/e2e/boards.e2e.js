import { test, expect } from '@playwright/test';

// Boards: a tournament played on two boards (the user's match called to board 1, a game live on
// board 2, the rest in the queue), the admin's tools, "Your match" for the player, the big screen of
// the boards, and a club night switched to boards.
const MOCK = process.env.MOCK_URL ?? 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const tournamentId = async () => (await (await fetch(`${MOCK}/api/tournaments`)).json()).tournaments[0].id;
const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// what was set up on boards does not stay for the other checks (the club night of tonight)
test.afterEach(async () => {
    await post('/__test/boards', { reset: true });
    await post('/__test/tournaments', { scenario: 'none' });
});

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/boards', { reset: true });
    await post('/__test/tournaments', { scenario: 'boards' });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
});

test('the admin sets the boards, holds a match back, and a finished game frees its board', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the logic once, at desktop width');
    await post('/__test/role', { admin: true });
    const id = await tournamentId();

    // three boards in the editor: the third stays free, as everyone waiting has a player on another board
    await page.goto(`/tournaments/${id}/edit`);
    const count = page.locator('#tournament-boards');
    await count.fill('3');
    await count.blur();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/tournaments/${id}$`));
    const boards = page.locator('.board-card');
    await expect(boards).toHaveCount(3);
    await expect(boards.nth(2)).toContainText('Board free');

    // the first of the queue held back: it waits apart, and comes back
    const queue = page.locator('.board-queue-row');
    const first = await queue.first().locator('.board-queue-pair .fw-semibold').innerText();
    await queue.first().getByRole('button', { name: 'Hold back' }).click();
    await expect(page.locator('.board-queue-row.is-held')).toContainText(first);
    await page.locator('.board-queue-row.is-held').getByRole('button', { name: 'Back in the queue' }).click();
    await expect(page.locator('.board-queue-row.is-held')).toHaveCount(0);

    // a board taken out (behind a confirm) is out
    await boards.nth(2).getByRole('button', { name: 'Take the board out' }).click();
    await page.locator('.p-confirm-dialog').getByRole('button', { name: 'Take the board out' }).click();
    await expect(boards.nth(2)).toContainText('Taken out');

    // the game live on board 2 is won: the board takes the next match
    const live = await (await fetch(`${MOCK}/api/tournaments/${id}`)).json();
    await post('/__test/boards', { finish: live.boardView.boards[1].key });
    await page.reload();
    await expect(boards.nth(1)).toContainText('Called');
});

test('a player sees "Your match: board 1", and the big screen shows the boards', async ({ page, browser, isMobile }) => {
    await post('/__test/role', { admin: false });
    const id = await tournamentId();

    await page.goto('/');
    await expect(page.locator('.up-next').first()).toContainText('Your match: board 1, against Eva');

    await page.goto(`/tournaments/${id}`);
    const mine = page.locator('.my-match');
    await expect(mine).toContainText('Board 1');
    await expect(mine).toContainText('against Eva');
    await expect(page.locator('.board-card')).toHaveCount(2);
    // a player has no admin tools
    await expect(page.getByRole('button', { name: 'Take the board out' })).toHaveCount(0);
    await page.screenshot({ path: `test-results/boards-tournament-${test.info().project.name}.png`, fullPage: true });
    if (isMobile) return;

    // the link of the big screen, opened without a login
    await page.locator('.p-panel').filter({ hasText: 'Next up' }).getByRole('button', { name: 'Big screen' }).click();
    const link = await page.getByRole('textbox', { name: 'Link for the big screen' }).inputValue();
    const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await post('/__test/logged-out', { loggedOut: true });
    await tv.goto(new URL(link).pathname);
    await expect(tv.locator('.big-board')).toHaveCount(2);
    await expect(tv.locator('.big-board').first()).toContainText('Anna');
    await expect(tv.locator('.big-boards-next li')).toHaveCount(4);
    await post('/__test/logged-out', { loggedOut: false });
});

test('a club night switched to boards calls the pairings', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the logic once, at desktop width');
    await post('/__test/role', { admin: true });
    await post('/__test/calendar', { scenario: 'tonight' });
    await page.goto(`/club-night/${today()}`);
    await page.locator('#night-boards').click();
    const boards = page.locator('.board-card');
    await expect(boards).toHaveCount(2);
    await expect(boards.first()).toContainText('Called');

    // someone goes home: saved on the night, not called again, back on a tap
    const chip = page.locator('.club-night-chip').last();
    const name = (await chip.locator('span span').first().textContent()).trim();
    await chip.getByRole('button', { name: `${name} went home` }).click();
    await expect(chip).toContainText('went home at');
    await expect.poll(async () => (await (await fetch(`${MOCK}/api/calendar/nights/${today()}/boards`)).json()).left.length).toBe(1);
    await page.reload();
    await expect(page.locator('.club-night-chip.is-gone')).toHaveCount(1);
    await page.locator('.club-night-chip.is-gone').getByRole('button', { name: `${name} is back` }).click();
    await expect(page.locator('.club-night-chip.is-gone')).toHaveCount(0);
});
