import { test, expect, MOCK } from './fixtures.js';

// "Match dart" is the dart at a finish of one dart that wins the match (D20, the bull …),
// not any finish: with 61 left (T11 D14, two darts) it is not there, with 40 left it is.
const post = (path, body = {}) => fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test.skip(({ isMobile }) => isMobile, 'the same rule at every width');

const open = async (page, visits) => {
    const v = (player, ...darts) => ({ player, darts });
    const game = {
        players: ['q1', 'q2'], quickPlayers: [{ id: 'q1', nickname: 'Pris' }, { id: 'q2', nickname: 'Patch Panther' }],
        startingScore: 101, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1,
        visits: visits.map(([player, ...darts]) => v(player, ...darts)),
    };
    const { game: created } = await (await post('/api/public/quick-games', { kind: 'x01', game })).json();
    await page.addInitScript(([id]) => localStorage.setItem('darts-score.quickGames', JSON.stringify({ [id]: { key: 'mock-key', at: Date.now() } })), [created.id]);
    await page.goto(`/quick/x01/${created.id}`);
    await expect(page.locator('.x01-hero-player.is-turn')).toBeVisible();
};

test('a match dart only on a finish of one dart', async ({ page }) => {
    // Pris has 61 left: a finish, but of two darts
    await open(page, [['q1', 'S20', 'S20', '0'], ['q2', 'S1', 'S1', 'S1']]);
    await expect(page.locator('.x01-hero-player.is-turn')).toContainText('Pris');
    await expect(page.getByText('Match dart', { exact: true })).toHaveCount(0);
});

test('a match dart at 40 left, for the one at the oche', async ({ page }) => {
    // Pris has 40 left: D20 wins the match
    await open(page, [['q1', 'T20', '0', 'S1'], ['q2', 'S1', 'S1', 'S1']]);
    const turn = page.locator('.x01-hero-player.is-turn');
    await expect(turn).toContainText('Pris');
    await expect(turn.getByText('Match dart', { exact: true })).toBeVisible();
});
