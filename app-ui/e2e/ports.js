// The ports of the stand-in for the API and of the app's dev server for the browser
// checks, in one place for playwright.config.js and the tests (e2e/fixtures.js).
// Another checkout runs on others: E2E_MOCK_PORT=3911 E2E_UI_PORT=5209 npm run e2e
export const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 3901);
export const UI_PORT = Number(process.env.E2E_UI_PORT ?? 5199);
export const MOCK_URL = `http://localhost:${MOCK_PORT}`;
export const UI_URL = `http://localhost:${UI_PORT}`;
