import { test, expect, MOCK } from './fixtures.js';

// The favourite, second and third favourite double, set in the player's profile: the second
// only after a favourite, a double chosen once is not offered again, and the ways out of a
// checkout training finish on them first, in their order.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('three favourite doubles, and the ways out finish on them first', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the logic once, at desktop width');
    // a player of the club (global admins play in no club)
    await post('/__test/role', { admin: false });
    await page.addInitScript(() => {
        localStorage.setItem('darts-score.activeClub', 'c1');
        localStorage.setItem('darts-score.install-hint', 'dismissed');
        localStorage.setItem('oche.x01Input', 'board');
    });
    await page.goto('/profile#playing');
    const field = (name) => page.locator('label', { has: page.getByText(name, { exact: true }) }).locator('.p-dropdown');
    const choose = async (name, value) => {
        await field(name).click();
        await page.locator('.p-dropdown-item', { hasText: new RegExp(`^${value}$`) }).click();
    };
    // the second waits for a favourite
    await expect(field('Second favourite double')).toHaveClass(/p-disabled/);
    await choose('Favourite double', 'D18');
    await choose('Second favourite double', 'D10');
    // D18 and D10 are taken: not offered for the third
    await field('Third favourite double').click();
    await expect(page.locator('.p-dropdown-item', { hasText: /^D18$/ })).toHaveCount(0);
    await page.locator('.p-dropdown-item', { hasText: /^D4$/ }).click();
    await expect(field('Third favourite double')).toContainText('D4');

    // 121 Checkout as Anna: the note names the three, the usual way ends on one of them
    await page.goto('/training/checkout121');
    const picker = page.locator('.player-pick-card');
    await expect(picker.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    while (await page.locator('.player-pick-card.is-chosen').count()) await page.locator('.player-pick-card.is-chosen').first().click();
    await picker.filter({ hasText: 'Anna' }).first().click();
    await page.getByRole('button', { name: 'Start training' }).click();
    await expect(page.getByText('Your favourite doubles first: D18, D10, D4 (set in the profile).')).toBeVisible();
    const usual = await page.locator('.x01-ways-route.is-preferred').first().innerText();
    expect(['D18', 'D10', 'D4']).toContain(usual.split('·').at(-1).trim());
});
