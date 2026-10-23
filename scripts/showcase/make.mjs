/**
 * The screenshots of the public start page, made from a demo club played
 * through the app itself. Run by run.sh, which starts an API on a throwaway
 * database and the UI for it; see there.
 *
 * node make.mjs play <ui url>        the demo club and its games
 * node make.mjs shoot <ui url> <dir>  the screenshots, as PNG
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { seed, ACCOUNT } from './seed.mjs';
import { seeded } from './thrower.mjs';
import { playX01, playCricket, playRulesGame, playHitMissTraining, startGame } from './play.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const [phase, base = 'http://localhost:5198', out = '.'] = process.argv.slice(2);
// what the play phase leaves for the shoot phase
const STATE = path.join(os.tmpdir(), 'oche-showcase.json');
const random = seeded(2026);

// how well each one throws, from 0 to 1
const SKILLS = { Lex: 0.55, Sammy: 0.45, Mia: 0.5, 'The Hammer': 0.7, Lena: 0.35, Tommy: 0.3 };
const NAMES = Object.keys(SKILLS);
const FORMAT = '501 Double Out · Best of 3 legs';
const GAMES = Number(process.env.GAMES ?? 16);

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await desktop.newPage();
const logIn = async () => {
    await page.goto(`${base}/login`);
    await page.fill('#login-email', ACCOUNT.email);
    await page.fill('#login-password', ACCOUNT.password);
    await page.click('button:has-text("Log in")');
    // the app moves on without loading a new page
    await page.waitForFunction(() => !location.pathname.startsWith('/login') || document.querySelector('.p-message-error'));
    const refused = await page.locator('.p-message-error').textContent().catch(() => null);
    if (refused) throw new Error(`Logging in failed: ${refused}`);
};

if (phase === 'play') {
const { players } = await seed(base);
log('demo club ready');
await logIn();

// the finished games: every pair in turn, with Lex often at the oche
let lastFinished = null;
for (let game = 0; game < GAMES; game++) {
    const first = game % 3 === 0 ? 'Lex' : NAMES[game % NAMES.length];
    const others = NAMES.filter(name => name !== first);
    const second = others[(game * 7) % others.length];
    await startGame(page, base, 'x01', [first, second], FORMAT);
    await playX01(page, SKILLS, random);
    lastFinished = new URL(page.url()).pathname;
    log(`game ${game + 1} of ${GAMES}: ${first} against ${second}`);
}

// the newer games of the rules engine, finished, for the statistics and the pages of the club
const HALVE_IT_AIMS = [20, 16, 20, 17, 20, 18, 20, 19, 25];
const RULES_GAMES = [
    ['shanghai', ['Lex', 'Mia', 'Tommy']],
    ['golf', ['The Hammer', 'Lena']],
    ['shanghai', ['Sammy', 'The Hammer']],
    ['halveit', ['Lex', 'Lena', 'Mia']],
    ['golf', ['Lex', 'Sammy']],
];
for (const [kind, players] of RULES_GAMES) {
    await startGame(page, base, `play/${kind}`, players, null);
    // Halve-It goes for its own targets (any double or treble, exactly 41: the 20 does)
    await playRulesGame(page, SKILLS, random, { players: players.length, targetOf: kind === 'halveit' ? (round) => HALVE_IT_AIMS[round] ?? 20 : undefined });
    log(`${kind}: ${players.join(', ')}`);
}

// trainings with Hit and Miss, a few attempts each, for the scoreboards and the bests
for (const [kind, rate] of [['bobs27', 0.75], ['doublesaround', 0.65]]) {
    for (const name of NAMES) {
        for (let attempt = 0; attempt < 2; attempt++) await playHitMissTraining(page, base, kind, name, SKILLS[name] * rate, random);
    }
    log(`${kind}: two attempts each`);
}

// a Cricket game and an X01 game under way, to be seen running
await startGame(page, base, 'cricket', ['Mia', 'Tommy', 'Lena'], null);
await playCricket(page, SKILLS, random, 14);
const cricketGame = new URL(page.url()).pathname;
await startGame(page, base, 'x01', ['Lex', 'The Hammer'], FORMAT);
await playX01(page, SKILLS, random, { stopAfter: 9 });
const x01Game = new URL(page.url()).pathname;
log('running games ready');
fs.writeFileSync(STATE, JSON.stringify({ lastFinished, cricketGame, x01Game, me: players[0].id }));
}

if (phase === 'shoot') {
const { lastFinished, cricketGame, x01Game, me } = JSON.parse(fs.readFileSync(STATE, 'utf8'));
await logIn();

const shoot = async (target, route, name, prepare) => {
    await target.goto(`${base}${route}`);
    await target.waitForLoadState('networkidle');
    await target.waitForTimeout(1500);
    for (const close of await target.locator('.game-moment-close, .p-dialog-header-close').all()) await close.click().catch(() => {});
    if (prepare) await prepare(target);
    await target.waitForTimeout(800);
    const png = await target.screenshot();
    // WebP, encoded by the browser itself: a fraction of the PNG, nothing to install
    const webp = await target.evaluate(async (data) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas.toDataURL('image/webp', 0.82).split(',')[1];
    }, png.toString('base64'));
    fs.writeFileSync(path.join(out, `${name}.webp`), Buffer.from(webp, 'base64'));
    log('shot', name, `${Math.round(webp.length * 0.75 / 1024)} KB`);
};

const boardInput = async (target) => {
    await target.click('.x01-input-switch >> text=Board').catch(() => {});
};
await shoot(page, x01Game, 'x01-game', boardInput);
await shoot(page, cricketGame, 'cricket-game', boardInput);
await shoot(page, lastFinished, 'game-stats', async (target) => {
    await target.click('button:has-text("Continue")').catch(() => {});
});
await shoot(page, '/', 'dashboard');
await shoot(page, `/players/${me}`, 'player-stats');

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: await desktop.storageState() });
await shoot(await phone.newPage(), x01Game, 'x01-game-phone', boardInput);
}

await browser.close();
log('done');
