import { test as base, expect } from '@playwright/test';
import { MOCK_URL } from './ports.js';

// What every browser check imports instead of @playwright/test: the address of
// the stand-in for the API (on the ports of playwright.config.js, see ports.js),
// and test with the stand-in reset before each test: the data as at its start,
// whatever the tests before changed or added (see mock/resettable.mjs). It runs
// before the test's own beforeEach, so a test seeds what it needs on a fresh one.
export const MOCK = MOCK_URL;

export const resetMock = async () => {
    const answer = await fetch(`${MOCK}/__test/reset`, { method: 'POST' });
    if (!answer.ok) throw new Error(`the mock at ${MOCK} did not reset (${answer.status}): is it e2e/mock/resettable.mjs?`);
};

export const test = base.extend({
    // Playwright reads the fixtures a fixture needs from its first argument: none here
    // eslint-disable-next-line no-empty-pattern
    mockReset: [async ({}, use) => { await resetMock(); await use(); }, { auto: true }],
    // a second browser a test opens (the TV of the big screen) is closed with the test, also when
    // it fails: left open it went on asking the stand-in every few seconds through the later tests
    strayContexts: [async ({ browser }, use) => {
        const before = new Set(browser.contexts());
        await use();
        await Promise.all(browser.contexts().filter(c => !before.has(c)).map(c => c.close().catch(() => {})));
    }, { auto: true }],
});
export { expect };
