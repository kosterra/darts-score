import { test, expect } from '@playwright/test';
import { MOCK_URL } from './ports.js';

// What every browser check imports instead of @playwright/test: the address of
// the stand-in for the API (on the ports of playwright.config.js, see ports.js).
export const MOCK = MOCK_URL;
export { test, expect };
