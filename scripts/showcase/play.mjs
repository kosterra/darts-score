import { visit, cricketVisit } from './thrower.mjs';

const pause = (page, ms) => page.waitForTimeout(ms);

// the visit being entered: whose it is and what they have left
const visitState = (page) => page.evaluate(() => {
    // read right away: a locator would wait for what a game does not show (Cricket has no "leaves")
    const title = [...document.querySelectorAll('.p-panel-title')].map(el => el.textContent).find(text => /visit$/.test(text)) ?? '';
    const left = document.body.innerText.match(/leaves (\d+)/)?.[1];
    return { player: title.replace(/[’']s visit$/, '').trim(), left: left === undefined ? NaN : Number(left) };
});

// closes what celebrates a moment (a 180, a leg won) so the next visit can be entered
const dismiss = async (page) => {
    for (const close of await page.locator('.game-moment-close').all()) await close.click({ timeout: 500 }).catch(() => {});
    await page.locator('button:has-text("Continue")').click({ timeout: 200 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
};

const enterDarts = async (page, darts) => {
    const inputs = page.locator('form:has(#submitThrows) input[type=text], form:has(#submitThrows) input:not([type])');
    for (const [index, dart] of darts.entries()) {
        // a field that is not there (the visit ended early) ends the visit
        const ok = await inputs.nth(index).fill(dart, { timeout: 2000 }).then(() => true, () => false);
        if (!ok) break;
    }
    await page.click('#submitThrows', { timeout: 5000 });
};

// a visit that could not be entered: the page is loaded again and the game goes on
const recover = async (page, error) => {
    console.warn(`a visit went wrong (${error.message.split('\n')[0]}), loading the game again`);
    await page.reload();
    await pause(page, 2000);
};

/**
 * Plays the X01 game that is open until it is over (or stopAfter visits, to
 * leave it running). skills: { nickname: 0..1 }.
 */
export const playX01 = async (page, skills, random, { stopAfter = Infinity } = {}) => {
    for (let visits = 0; visits < Math.min(stopAfter, 400); visits++) {
        await dismiss(page);
        if (!/^\/(quick\/)?x01\/[^/]+$/.test(new URL(page.url()).pathname)) return;
        const state = await visitState(page);
        if (!state.player || Number.isNaN(state.left)) {
            await pause(page, 400);
            continue;
        }
        try {
            await enterDarts(page, visit(state.left, skills[state.player] ?? 0.4, random));
        } catch (error) {
            await recover(page, error);
            continue;
        }
        await page.waitForFunction((before) => {
            const title = [...document.querySelectorAll('.p-panel-title')].map(el => el.textContent).find(text => /visit$/.test(text)) ?? '';
            const leaves = document.body.innerText.match(/leaves (\d+)/)?.[1];
            return !location.pathname.match(/^\/(quick\/)?x01\/[^/]+$/) || `${title}|${leaves}` !== before;
        }, `${state.player}'s visit|${state.left}`, { timeout: 8000 }).catch(() => {});
        await pause(page, 120);
    }
};

export { cricketVisit };

/**
 * Sets up a game on its setup page (/x01, /cricket) with the players in
 * this order and a quick format, and starts it.
 */
export const startGame = async (page, base, kind, nicknames, format) => {
    await page.goto(`${base}/${kind}`);
    await page.waitForSelector('.player-pick-card');
    // the setup remembers the last players: start from none
    const remove = page.locator('.player-order button[aria-label^="Remove "]');
    for (let left = await remove.count(); left > 0; left--) {
        await remove.first().click();
        await pause(page, 100);
    }
    // the picker shows the players of late first, the others behind "Show all"
    await page.locator('button:has-text("Show all")').click({ timeout: 500 }).catch(() => {});
    for (const name of nicknames) await page.locator('.player-pick-card', { has: page.locator('.player-pick-name', { hasText: new RegExp(`^${name}$`) }) }).click();
    if (format) await page.click(`.quick-format:has-text("${format}")`);
    const start = page.locator('button[aria-label="Start game"]');
    await start.waitFor();
    if (await start.isDisabled()) {
        await pause(page, 1000);
        if (await start.isDisabled()) throw new Error(`The game cannot start: ${await page.locator('.game-setup-summary').textContent()}`);
    }
    await start.click();
    await page.waitForURL(new RegExp(`/${kind}/[^/]+$`));
    await pause(page, 800);
};

/**
 * Enters "visits" visits in the Cricket game that is open, going for the
 * numbers from 20 down as the game goes on; leaves the game running.
 */
export const playCricket = async (page, skills, random, visits) => {
    const order = [20, 19, 18, 17, 16, 15, 25];
    for (let count = 0; count < visits; count++) {
        await dismiss(page);
        if (!/^\/(quick\/)?cricket\/[^/]+$/.test(new URL(page.url()).pathname)) return;
        const { player } = await visitState(page);
        if (!player) { await pause(page, 400); continue; }
        const at = Math.floor(count / 4);
        try {
            await enterDarts(page, cricketVisit(order.slice(at, at + 2), skills[player] ?? 0.4, random));
        } catch (error) {
            await recover(page, error);
            continue;
        }
        await page.waitForFunction((before) => {
            const title = [...document.querySelectorAll('.p-panel-title')].map(el => el.textContent).find(text => /visit$/.test(text)) ?? '';
            return title !== before;
        }, `${player}'s visit`, { timeout: 5000 }).catch(() => {});
        await pause(page, 150);
    }
};

// a dart aimed at a number: a treble, a double, a single or a miss, the better the player the more often it hits
const aimedDart = (target, skill, random) => {
    const roll = random();
    // the bull has no treble
    // trebles and doubles rarely, so a Shanghai (all three in one visit) stays rare
    if (roll < skill * 0.1) return target === 25 ? 'D25' : `T${target}`;
    if (roll < skill * 0.18) return `D${target}`;
    if (roll < skill + 0.15) return `S${target}`;
    return roll < 0.92 ? `S${1 + Math.floor(random() * 20)}` : '0';
};

/**
 * Plays the game of the rules engine that is open (Shanghai, Golf, Halve-It,
 * …) until it is over, or stopAfter visits to leave it running. The darts
 * go for the number of the round (Shanghai and Golf count up from 1),
 * "targetOf(round)" chooses another.
 */
export const playRulesGame = async (page, skills, random, { players, stopAfter = Infinity, targetOf = (round) => round + 1 } = {}) => {
    for (let visits = 0; visits < Math.min(stopAfter, 400);) {
        await dismiss(page);
        if (!/^\/play\/[^/]+\/[^/]+$/.test(new URL(page.url()).pathname)) return;
        const { player } = await visitState(page);
        if (!player) { await pause(page, 400); continue; }
        const target = targetOf(Math.floor(visits / players));
        const skill = skills[player] ?? 0.4;
        try {
            await enterDarts(page, [0, 1, 2].map(() => aimedDart(target, skill, random)));
            visits += 1;
        } catch (error) {
            await recover(page, error);
            continue;
        }
        await page.waitForFunction((before) => {
            const title = [...document.querySelectorAll('.p-panel-title')].map(el => el.textContent).find(text => /visit$/.test(text)) ?? '';
            return title !== before || !/^\/play\/[^/]+\/[^/]+$/.test(location.pathname);
        }, `${player}'s visit`, { timeout: 5000 }).catch(() => {});
        await pause(page, 150);
    }
};

/**
 * One attempt at a training with Hit and Miss (Bob's 27, Doubles around the
 * board) for one player, through its page, saved when it is over.
 */
export const playHitMissTraining = async (page, base, kind, nickname, skill, random) => {
    await page.goto(`${base}/training/${kind}`);
    await page.waitForSelector('.player-pick-card');
    await page.locator('button:has-text("Show all")').click({ timeout: 500 }).catch(() => {});
    const card = page.locator('.player-pick-card', { has: page.locator('.player-pick-name', { hasText: new RegExp(`^${nickname}$`) }) });
    if ((await card.getAttribute('aria-pressed')) !== 'true') await card.click();
    await page.click('button:has-text("Start training")');
    const buttons = page.locator('.rules-hitmiss button');
    await buttons.first().waitFor({ timeout: 5000 });
    for (let dart = 0; dart < 400 && await buttons.first().isVisible().catch(() => false); dart++) {
        await buttons.nth(random() < skill ? 0 : 1).click({ timeout: 2000 }).catch(() => {});
        await pause(page, 40);
    }
    // saved: the page offers the next attempt
    await page.locator('button:has-text("Again")').waitFor({ timeout: 10000 }).catch(() => {});
};
