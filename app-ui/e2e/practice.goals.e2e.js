import { test, expect } from '@playwright/test';

// One's own goals for the week: set on the profile (saved as you go), shown with how far
// each is on one's own Dashboard, and the two notifications they bring in the settings.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const asPlayer = async (page) => {
    await post('/__test/logged-out', { loggedOut: false });
    // a player of the club: global admins play in no club and have no goals
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
    });
};

test.describe('weekly practice goals', () => {
    test.afterEach(async () => {
        await post('/__test/goals', {});
        await post('/__test/role', { admin: true });
    });

    test('a goal set on the profile, its progress on the Dashboard, its notifications', async ({ page, isMobile }) => {
        test.skip(isMobile, 'once is enough: setting a goal works the same at every width');
        await post('/__test/goals', {});
        await asPlayer(page);

        // none yet: the Dashboard says how to set some
        await page.goto('/');
        const widget = page.locator('.p-panel', { has: page.getByText('Your goals this week', { exact: true }) });
        await expect(widget).toContainText('No goals yet');
        await widget.getByRole('link', { name: 'Set your goals' }).click();
        await expect(page).toHaveURL(/\/profile#playing$/);

        // a goal of three trainings, saved at once; then four, saved after typing
        const editor = page.locator('#goals');
        await editor.getByRole('button', { name: 'Add a goal' }).click();
        await expect(editor.locator('.autosave-status.is-saved')).toBeVisible();
        await expect(editor.locator('.practice-goal')).toContainText('3 trainings');
        await expect(editor.locator('.practice-goal')).toContainText('2 / 3');
        const target = editor.getByRole('spinbutton', { name: 'Target' });
        await target.fill('4');
        await target.blur();
        await expect(editor.locator('.practice-goal')).toContainText('2 / 4');

        // a score of Bob's 27: the training comes with it
        await editor.getByRole('button', { name: 'Add a goal' }).click();
        await editor.locator('.practice-goal-kind').nth(1).click();
        await page.getByRole('option', { name: 'Best score in a training' }).click();
        await expect(editor.locator('.practice-goal-training').nth(1)).toContainText('Bob\'s 27');
        await expect(editor.locator('.practice-goal').nth(1)).toContainText('100 or better in Bob\'s 27');
        await expect(editor.locator('.practice-goal').nth(1)).toContainText('87 / 100');
        // 121 Checkout: a score counts with the attempts and the darts chosen, and starts where it can be reached (from 121)
        await editor.locator('.practice-goal-training').nth(1).click();
        await page.getByRole('option', { name: '121 Checkout' }).click();
        const board = editor.locator('.practice-goal-board');
        await expect(board.locator('.p-selectbutton')).toHaveCount(2);
        await board.getByText('20 attempts', { exact: true }).click();
        await expect(editor.locator('.practice-goal').nth(1)).toContainText('125 or better in 121 Checkout (20 attempts, 9 darts)');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await board.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/practice-goals-board-${test.info().project.name}.png` });
        // back to Bob's 27: no settings to choose
        await editor.locator('.practice-goal-training').nth(1).click();
        await page.getByRole('option', { name: 'Bob\'s 27' }).click();
        await expect(board).toHaveCount(0);

        // the Dashboard shows them with how far each is
        await page.goto('/');
        await expect(widget.locator('.practice-goal')).toHaveCount(2);
        await expect(widget.locator('.practice-goal').first()).toContainText('2 / 4');
        await expect(widget.locator('.practice-week-dots > span')).toHaveCount(8);
        await page.screenshot({ path: `test-results/practice-goals-dashboard-${test.info().project.name}.png`, fullPage: true });

        // the notifications of the goals, on in the app and off by mail
        await page.goto('/profile#notifications');
        await expect(page.getByText('Weekly goals reached', { exact: true })).toBeVisible();
        await expect(page.getByText('Weekly goals on Sunday', { exact: true })).toBeVisible();
    });

    test('the goals with past weeks fit the screen', async ({ page }) => {
        await post('/__test/goals', { scenario: 'set' });
        await asPlayer(page);
        await page.goto('/profile#playing');
        const editor = page.locator('#goals');
        await expect(editor.locator('.practice-goal')).toHaveCount(3);
        await expect(editor.getByText('Past weeks')).toBeVisible();
        await expect(editor.getByText('2 weeks in a row')).toBeVisible();
        // nothing wider than the screen
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await editor.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/practice-goals-profile-${test.info().project.name}.png`, fullPage: true });

        await page.goto('/');
        const widget = page.locator('.p-panel', { has: page.getByText('Your goals this week', { exact: true }) });
        await expect(widget.locator('.practice-goal.is-reached')).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
});
