import fs from 'node:fs';
import { mergeConfig, searchForWorkspaceRoot } from 'vite';
import app from '../vite.config.ts';

// The dev server of the browser checks (playwright.config.js): the app's own
// config, plus
// - the app compiled from its entry as the server starts, while Playwright launches
//   (e2e/global.setup.js then opens the main pages in a browser and waits for them;
//   warming every file of src took twice as long as it saved);
// - GET /__e2e/checkout, the folder it serves, so a server left running from
//   another checkout is not taken for this one;
// - node_modules served where it really lies (a checkout that links it from another);
// - its optimised dependencies in a folder of this checkout's own (.cache is ignored by git):
//   not those of node_modules/.vite, which the app's own dev server, or another checkout
//   linking the same node_modules, can optimise anew while the tests run.
export default mergeConfig(app, {
    cacheDir: '.cache/vite-e2e',
    server: {
        warmup: { clientFiles: ['./src/main.jsx'] },
        fs: { allow: [searchForWorkspaceRoot(process.cwd()), fs.realpathSync('node_modules')] },
    },
    plugins: [{
        name: 'e2e-checkout',
        configureServer(server) {
            server.middlewares.use('/__e2e/checkout', (req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ checkout: server.config.root }));
            });
        },
    }],
});
