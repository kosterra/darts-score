import { test, expect, MOCK } from './fixtures.js';

// Scram is played by two exactly: the stopper closes, the scorer scores on what is still open.
// Baseball scores the inning's number and the bullseye as a home run.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
        localStorage.setItem('oche.x01Input', 'keypad');
    });
});

const setup = async (page, kind, count) => {
    await page.goto(`/play/${kind}`);
    const cards = page.locator('.player-pick-card');
    await expect(cards.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await page.locator('.player-pick-card.is-chosen').count()) await page.locator('.player-pick-card.is-chosen').first().click();
    for (let i = 0; i < count; i++) await cards.nth(i).click();
};
const throwVisit = async (page, fields) => {
    const keypad = page.locator('.x01-keypad');
    for (const field of fields) {
        if (field === '0') await keypad.getByRole('button', { name: 'Miss', exact: true }).click();
        else if (field === 'D25') await keypad.getByRole('button', { name: 'Bullseye, 50', exact: true }).click();
        else {
            const name = { S: 'Single', D: 'Double', T: 'Treble' }[field[0]];
            if (field[0] !== 'S') await keypad.locator('.x01-keypad-rings').getByText(name, { exact: true }).click();
            await keypad.getByRole('button', { name: `${name} ${field.slice(1)}`, exact: true }).click();
        }
    }
    await page.locator('#submitThrows').click();
};

test('Scram: two players only; a closed number scores nothing for the scorer', async ({ page }) => {
    await setup(page, 'scram', 3);
    await expect(page.getByText('This game is played by 2 players.')).toBeVisible();
    await page.locator('.player-pick-card').nth(2).click();
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.locator('.x01-live-hero')).toContainText('Stopper: closing');
    await throwVisit(page, ['S20', 'T19', 'D18']);
    // 20 is closed: only the treble 17 scores
    await throwVisit(page, ['T20', 'T17', '0']);
    await expect(page.locator('.x01-live-hero')).toContainText('51');
    await expect(page.locator('.x01-live-hero')).toContainText('Close: 17 · 16 · 15 · Bull');
    // the numbers in view as on the cricket board: 20, 19 and 18 crossed out, the rest open
    await expect(page.locator('.scram-numbers-list:visible .scram-number.is-closed')).toHaveCount(3);
    await expect(page.locator('.scram-numbers-list:visible .scram-number:not(.is-closed)')).toHaveCount(4);
    // the stopper's darts being entered close in gold
    await page.locator('.x01-keypad').getByRole('button', { name: 'Single 17', exact: true }).click();
    await expect(page.locator('.scram-numbers-list:visible .scram-number.is-new')).toHaveText('17');
    await page.screenshot({ path: `/tmp/claude-1000/-home-kostera-dev-darts-score/ce8cb453-b13d-4f4e-b1e2-6317907feace/scratchpad/scram-numbers-${test.info().project.name}.png` });
});

test('Baseball: the inning\'s number scores a run per ring, the bullseye a home run', async ({ page }) => {
    await setup(page, 'baseball', 2);
    await page.getByRole('button', { name: 'Start game' }).click();
    await throwVisit(page, ['T1', 'S1', 'D25']);
    await expect(page.locator('.x01-live-hero')).toContainText('8');
    await expect(page.locator('.x01-live-hero')).toContainText('1 home run');
});
