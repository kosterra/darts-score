// The stand-in for the API as the browser checks use it: server.mjs with a reset.
// Its state lives in the modules of server.mjs and its helpers, so a reset starts
// a fresh one rather than undoing what the tests changed: this server passes every
// request on to the current server.mjs (on a free port of its own), and
//
//   POST /__test/reset   swaps it for a fresh one, the data as at the start;
//   GET  /__test/checkout the folder of the app it belongs to (e2e/global.setup.js
//                         makes sure a server left running belongs to this checkout).
//
// A fresh one is started ahead, while the tests run, so a reset costs next to nothing
// (starting one takes about a second). The environment (AS_PLAYER, DASH=0, …) goes to each.
//
//   MOCK_PORT=3901 node e2e/mock/resettable.mjs
import http from 'node:http';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = Number(process.env.MOCK_PORT) || 3901;
const SERVER = fileURLToPath(new URL('./server.mjs', import.meta.url));
const CHECKOUT = path.resolve(path.dirname(SERVER), '../..');
// a request still on its way to the server just replaced gets its answer
const GRACE_MS = 5_000;

const start = () => {
    const child = fork(SERVER, [], { env: { ...process.env, MOCK_PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit', 'ipc'] });
    const ready = new Promise((resolve, reject) => {
        let out = '';
        const onData = (chunk) => {
            out += chunk;
            const port = out.match(/mock on (\d+)/)?.[1];
            if (!port) return;
            child.stdout.off('data', onData);
            child.stdout.pipe(process.stdout);
            resolve(Number(port));
        };
        child.stdout.on('data', onData);
        child.once('exit', (code) => reject(new Error(`the mock stopped (${code}) before it was ready`)));
    });
    // a rejection nobody waits for yet is not an unhandled one
    ready.catch(() => {});
    return { child, ready };
};

let current = start();
let next = start();
let resets = Promise.resolve();

const reset = () => {
    resets = resets.then(async () => {
        const old = current;
        current = next;
        next = start();
        await current.ready;
        setTimeout(() => old.child.kill(), GRACE_MS).unref();
    });
    return resets;
};

const server = http.createServer(async (req, res) => {
    if (req.url === '/__test/reset' && req.method === 'POST') {
        try { await reset(); } catch (error) { res.writeHead(500); return res.end(String(error)); }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end('{}');
    }
    if (req.url === '/__test/checkout') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ checkout: CHECKOUT }));
    }
    let port;
    try { port = await current.ready; } catch (error) { res.writeHead(502); return res.end(String(error)); }
    const upstream = http.request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers: { ...req.headers, connection: 'close' },
        // a connection of its own: one kept open could be closed by the server just as it is reused
        agent: false }, (answer) => {
        res.writeHead(answer.statusCode, answer.headers);
        answer.pipe(res);
    });
    upstream.on('error', (error) => {
        console.error(`mock: ${req.method} ${req.url} failed: ${error.message}`);
        if (!res.headersSent) res.writeHead(502);
        res.end(String(error));
    });
    req.pipe(upstream);
});

server.listen(PORT, () => console.log(`resettable mock on ${PORT}`));

const stop = () => {
    for (const { child } of [current, next]) child.kill();
    process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
process.on('SIGHUP', stop);
