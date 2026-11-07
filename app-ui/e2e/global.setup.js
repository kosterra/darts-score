import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOCK_URL, UI_URL } from './ports.js';

// Before the first test (playwright.config.js, globalSetup):
// 1. the stand-in for the API and the dev server must belong to this checkout: a run
//    on a machine where they were left running (reuseExistingServer) takes them
//    over, and one of another checkout would test other code;
// 2. the dev server warmed up: its dependencies optimised and the pages compiled,
//    which takes the first page opened up to a minute (it timed out the first test).
const CHECKOUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checkoutOf = async (url, what, port) => {
    let answer;
    try { answer = await fetch(url); } catch (error) { throw new Error(`${what} at ${url} does not answer: ${error.message}`); }
    const body = answer.ok ? await answer.json().catch(() => null) : null;
    if (typeof body?.checkout !== 'string' || path.resolve(body.checkout) !== CHECKOUT) {
        throw new Error(`${what} on port ${port} is not this checkout's (${body?.checkout ?? 'an older or other server'}). `
            + `Stop it, or run on other ports: E2E_MOCK_PORT=… E2E_UI_PORT=… npm run e2e`);
    }
};

// the app's shell and the parts most pages share (the player picker, the statistics, the public
// pages): each further page costs ~2 s more here, and compiles in a moment when a test opens it
const PAGES = ['/', '/x01', '/training/x01', '/players/p1', '/quick'];

export default async function globalSetup() {
    await checkoutOf(`${MOCK_URL}/__test/checkout`, 'The mock', new URL(MOCK_URL).port);
    await checkoutOf(`${UI_URL}/__e2e/checkout`, 'The dev server', new URL(UI_URL).port);

    const started = Date.now();
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
        for (const to of PAGES) {
            await page.goto(`${UI_URL}${to}`, { timeout: 180_000 });
            await page.waitForLoadState('networkidle', { timeout: 180_000 });
        }
    } finally {
        await browser.close();
        // what the warm-up changed is gone before the first test
        await fetch(`${MOCK_URL}/__test/reset`, { method: 'POST' });
    }
    console.log(`warmed up the dev server in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}
