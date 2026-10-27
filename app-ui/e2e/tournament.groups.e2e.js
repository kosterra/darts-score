import { test, expect } from '@playwright/test';

// A tournament with groups first: the admin chooses the groups at the draw, the groups are
// played round robin, and the best of each fill the knockout bracket.
const MOCK = 'http://localhost:3901';
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('groups first, then the bracket of the best of each group', async ({ page }) => {
    await post('/__test/logged-out', { loggedOut: false });
    await post('/__test/role', { admin: true });
    await post('/__test/tournaments', { scenario: 'groups' });
    const { tournaments } = await (await fetch(`${MOCK}/api/tournaments`)).json();
    const id = tournaments.find(entry => entry.name === 'Group Cup').id;
    await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
    await page.goto(`/tournaments/${id}`);

    // the draw suggests one group of all six, the top 2 going on: the final
    const plan = page.locator('.tournament-group-plan');
    await expect(plan).toContainText('6 players: one group of 6, the top 2 of each go on → Final.');
    // groups of 3 instead: two groups, the semi-finals
    await plan.getByRole('button', { name: '3', exact: true }).first().click();
    await expect(plan).toContainText('6 players: 2 groups of 3, the top 2 of each go on → Semi-finals.');
    // more going on than a group has: refused before the draw
    await plan.getByRole('button', { name: '3', exact: true }).nth(1).click();
    await expect(plan.getByText('Fewer players go on than a group has.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hold the draw' })).toBeDisabled();
    await plan.getByRole('button', { name: '2', exact: true }).nth(0).click();
    await page.screenshot({ path: `test-results/groups-draw-${test.info().project.name}.png`, fullPage: true });

    await page.getByRole('button', { name: 'Hold the draw' }).click();
    await page.locator('.p-confirm-dialog-accept').click();
    await expect(page.locator('.tournament-group')).toHaveCount(2);
    await expect(page.locator('.tournament-group').first().locator('tbody tr')).toHaveCount(3);
    await expect(page.locator('.tournament-group').first().locator('.bracket-match')).toHaveCount(3);

    // every group match decided: the first player of each wins
    const t = await (await fetch(`${MOCK}/api/tournaments/${id}`)).json();
    for (const match of t.matches.filter(entry => entry.group != null)) {
        await post(`/api/tournaments/${id}/matches/${match.id}/result`, { winner: match.players[0] });
    }
    await page.reload();
    const done = await (await fetch(`${MOCK}/api/tournaments/${id}`)).json();
    const semis = done.matches.filter(match => match.size === 4);
    expect(semis.every(match => match.status === 'ready')).toBe(true);
    const groupOf = (player) => done.draw.groups.findIndex(group => group.includes(player));
    for (const semi of semis) expect(groupOf(semi.players[0])).not.toBe(groupOf(semi.players[1]));
    await expect(page.locator('.tournament-group tr.goes-on')).toHaveCount(4);
    await page.screenshot({ path: `test-results/groups-stage-${test.info().project.name}.png`, fullPage: true });
});
