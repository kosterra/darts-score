import { test, expect } from '@playwright/test';

// A tournament and a league that are over: the match tiles show each player's sets or legs
// won (and where there is room the level played at), and a match's dialog only shows what
// happened, without anything to start, decide or move.
const MOCK = process.env.MOCK_URL ?? 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    // an admin: the one who would see the actions
    await post('/__test/role', { admin: true });
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
});

test('a finished tournament shows the results and its matches only as they were played', async ({ page, isMobile }) => {
    await post('/__test/tournaments', { scenario: 'groupsFinished' });
    const { tournaments } = await (await fetch(`${MOCK}/api/tournaments`)).json();
    const tournament = tournaments.find(entry => entry.name === 'Cup with Groups');
    await page.goto(`/tournaments/${tournament.id}`);
    await expect(page.locator('.tournament-champion')).toBeVisible();

    // a played group match: the legs won after each name, the level played at beside them
    const groupMatches = tournament.matches.filter(match => match.group != null);
    const played = groupMatches.find(match => match.status === 'done');
    const firstTile = page.locator('.tournament-group').first().locator('.bracket-match').first();
    await expect(firstTile.locator('.bracket-score')).toHaveText([String(played.score.legs[0]), String(played.score.legs[1])]);
    await expect(firstTile.locator('.play-level-tag').first()).toBeVisible();
    // the walkover has no numbers, only its label
    const walkover = page.locator('.tournament-group .bracket-match', { hasText: 'Walkover' });
    await expect(walkover).toHaveCount(1);
    await expect(walkover.locator('.bracket-score')).toHaveText(['', '']);
    await page.screenshot({ path: `test-results/finished-groups-${test.info().project.name}.png`, fullPage: true });

    // the final was played over sets: the sets won
    const bracket = page.locator('.bracket').filter({ visible: true });
    if (isMobile) await page.locator('.p-selectbutton').getByText('Final', { exact: true }).click();
    const final = bracket.locator('.bracket-round').last().locator('.bracket-match');
    await expect(final.locator('.bracket-score')).toHaveText(['2', '1']);
    await bracket.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/finished-bracket-${test.info().project.name}.png`, fullPage: true });

    // the dialog of the final: who won, the score, the statistics; nothing to decide
    await final.click();
    const dialog = page.locator('.tournament-dialog');
    await expect(dialog.getByText(/won\.$/)).toBeVisible();
    await expect(dialog.locator('.match-result')).toContainText('sets');
    await expect(dialog.locator('.match-result .play-level-tag')).toHaveCount(2);
    await expect(dialog.getByRole('link', { name: 'Statistics of the match' })).toBeVisible();
    await expect(dialog.getByText('Decide without a game')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Goes on' })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Start the match' })).toHaveCount(0);
    await page.screenshot({ path: `test-results/finished-dialog-${test.info().project.name}.png` });
    await page.keyboard.press('Escape');

    // the walkover's dialog: only who went on
    await walkover.click();
    await expect(dialog.getByText('(decided by an admin)')).toBeVisible();
    await expect(dialog.locator('.match-result')).toHaveCount(0);
    await expect(dialog.getByText('Decide without a game')).toHaveCount(0);
    await expect(page.getByText('Tap a match for its result and statistics.')).toBeVisible();
});

test('a finished league shows the results and its matches only as they were played', async ({ page }) => {
    await post('/__test/leagues', { scenario: 'finished' });
    const { leagues } = await (await fetch(`${MOCK}/api/leagues`)).json();
    await page.goto(`/leagues/${leagues[0].id}`);
    await expect(page.locator('.tournament-champion')).toBeVisible();
    // the last matchday shows: its walkover without numbers, a played match with them
    const matches = page.locator('.league-columns .league-matches .bracket-match');
    const walkover = matches.filter({ hasText: 'Walkover' });
    await expect(walkover).toHaveCount(1);
    await expect(walkover.locator('.bracket-score')).toHaveText(['', '']);
    const played = matches.filter({ hasNotText: 'Walkover' }).first();
    await expect(played.locator('.bracket-score')).toHaveText([/^\d$/, /^\d$/]);
    await page.screenshot({ path: `test-results/finished-league-${test.info().project.name}.png`, fullPage: true });

    await played.click();
    const dialog = page.locator('.tournament-dialog');
    await expect(dialog.locator('.match-result')).toContainText('legs');
    await expect(dialog.getByRole('link', { name: 'Statistics of the match' })).toBeVisible();
    await page.screenshot({ path: `test-results/finished-league-dialog-${test.info().project.name}.png` });
    await page.keyboard.press('Escape');
    await walkover.click();
    await expect(dialog.getByText('(decided by an admin)')).toBeVisible();
    for (const words of ['Decide without a game', 'Move the match']) await expect(dialog.getByText(words)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Move the matchday' })).toHaveCount(0);
    await expect(page.getByText('Tap a match for its result and statistics.')).toBeVisible();
});
