import { defineConfig, devices } from '@playwright/test';

// The browser checks (e2e/*.e2e.js): the app against the stand-in for the
// API (e2e/mock/server.mjs), at the width of a desktop and of a phone.
// npm run e2e (the first time: npx playwright install chromium). In CI they run in
// Playwright's image of the same version (.github/workflows/checks.yml): update both together.
const MOCK = 3901;
const UI = 5199;

export default defineConfig({
    testDir: './e2e',
    testMatch: /.*\.e2e\.js$/,
    // the tests share one stand-in for the API and switch its cases: one after the other
    workers: 1,
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    // the dev server compiles a page the first time it is asked for
    expect: { timeout: 20_000 },
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${UI}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ],
    webServer: [
        { command: `node e2e/mock/server.mjs`, port: MOCK, env: { MOCK_PORT: String(MOCK) }, reuseExistingServer: !process.env.CI, stdout: 'pipe', timeout: 60_000 },
        { command: `npx vite --port ${UI} --strictPort`, port: UI, env: { API_PROXY_TARGET: `http://localhost:${MOCK}` }, reuseExistingServer: !process.env.CI, stdout: 'pipe', timeout: 120_000 },
    ],
});
