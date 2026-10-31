import { defineConfig, configDefaults } from 'vitest/config';

// The fast unit tests (src/**). The integration tests under test/integration
// spin up a real in-memory MongoDB and run from vitest.integration.config.js.
export default defineConfig({
    test: {
        exclude: [...configDefaults.exclude, 'test/integration/**'],
    },
});
