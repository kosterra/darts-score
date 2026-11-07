import { defineConfig, devices } from '@playwright/test';
import { MOCK_PORT as MOCK, UI_PORT as UI, MOCK_URL, UI_URL } from './e2e/ports.js';

// The browser checks (e2e/*.e2e.js): the app against the stand-in for the
// API (e2e/mock/server.mjs), at the width of a desktop and of a phone.
// npm run e2e (the first time: npx playwright install chromium). In CI they run in
// Playwright's image of the same version (.github/workflows/checks.yml): update both together.
// Other ports (when another checkout runs its checks): E2E_MOCK_PORT=3911 E2E_UI_PORT=5209 npm run e2e

export default defineConfig({
    testDir: './e2e',
    testMatch: /.*\.e2e\.js$/,
    // the tests share one stand-in for the API and switch its cases: one after the other,
    // each on a fresh one (the test of e2e/fixtures.js resets it)
    workers: 1,
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 20_000 },
    // the servers belong to this checkout, and the dev server has compiled the app
    globalSetup: './e2e/global.setup.js',
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: UI_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ],
    // locally, servers left running from an earlier run are taken over: the setup checks they
    // are this checkout's, and every test resets the stand-in, so nothing stale is left in them
    webServer: [
        { command: `node e2e/mock/resettable.mjs`, port: MOCK, env: { MOCK_PORT: String(MOCK) }, reuseExistingServer: !process.env.CI, stdout: 'pipe', timeout: 60_000 },
        // without V8's fast API calls: Node 24 (in Playwright's image) can abort with "Lazy deopt after a
        // fast API call" while Vite sends a large module, which took the server down mid-run
        { command: `node --no-turbo-fast-api-calls node_modules/vite/bin/vite.js --config e2e/vite.config.mjs --port ${UI} --strictPort`, port: UI, env: { API_PROXY_TARGET: MOCK_URL }, reuseExistingServer: !process.env.CI, stdout: 'pipe', timeout: 120_000 },
    ],
});
