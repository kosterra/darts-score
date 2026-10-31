import { defineConfig } from 'vitest/config';

// Integration tests: they start an in-memory MongoDB, connect the app to it and
// drive the real Express app (routes + middleware) with supertest. Run on their
// own (npm run test:integration) so the unit suite stays fast and independent.
export default defineConfig({
    test: {
        include: ['test/integration/**/*.test.js'],
        // the shared mongoose singleton forgets the models of the file before
        setupFiles: ['test/integration/setup.models.js'],
        // one in-memory server, one connection: run the file(s) in a single fork, in order
        fileParallelism: false,
        pool: 'forks',
        poolOptions: { forks: { singleFork: true } },
        // the first run downloads the mongod binary; starting it takes a moment
        testTimeout: 30000,
        hookTimeout: 180000,
    },
});
