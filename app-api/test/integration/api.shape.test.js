import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BREACHED_PASSWORD_CHECK = 'off';

/**
 * The shape of the API under odd requests, as a fuzzer sends them (found by
 * Schemathesis and ZAP on 2026-10-31): no body at all, a body that is not
 * JSON, an unknown API path, and the caching and permission headers.
 */

let mongod;
let db;
let app;
let cookie;
const api = () => supertest(app);
const PASSWORD = 'Passw0rd!';

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    const { hashPassword } = await import('../../src/utils/auth.utils.js');
    await db.user.create({ email: 'shape@test.local', firstname: 'Sam', lastname: 'Shape', passwordHash: await hashPassword(PASSWORD) });
    const login = await api().post('/api/auth/login').send({ email: 'shape@test.local', password: PASSWORD });
    expect(login.status).toBe(200);
    cookie = login.headers['set-cookie'].map(line => line.split(';')[0]).join('; ');
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
});

describe('a request without a body', () => {
    it('is an empty one, not a server error', async () => {
        const res = await api().put('/api/auth/onboarding').set('Cookie', cookie);
        expect(res.status).toBe(200);
    });
});

describe('a body that is not JSON', () => {
    it('is refused with 400 and a plain message', async () => {
        const res = await api().put('/api/auth/language').set('Cookie', cookie).set('Content-Type', 'application/json').send('"AAA"');
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('The request body is not valid JSON.');
    });
    it('is refused with 400 when it is not even JSON', async () => {
        const res = await api().put('/api/auth/language').set('Cookie', cookie).set('Content-Type', 'application/json').send('{not json');
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('The request body is not valid JSON.');
    });
});

describe('an unknown API path', () => {
    it('asks for a login first', async () => {
        expect((await api().get('/api/no/such/route')).status).toBe(401);
    });
    it('is 404 as JSON for every method once logged in, never the app', async () => {
        for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
            const res = await api()[method]('/api/no/such/route').set('Cookie', cookie);
            expect(res.status, method).toBe(404);
            expect(res.headers['content-type'], method).toMatch(/json/);
            expect(res.body).toEqual({ message: 'Not found' });
        }
    });
});

describe('headers', () => {
    it('never lets an API answer be cached', async () => {
        const res = await api().get('/api/auth/me').set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('no-store');
    });
    it('lets the public overview keep its short cache', async () => {
        const res = await api().get('/api/public/overview');
        expect(res.headers['cache-control']).toMatch(/max-age/);
    });
    it('declares the browser features the app does not use', async () => {
        const res = await api().get('/api/health');
        expect(res.headers['permissions-policy']).toMatch(/microphone=\(\)/);
    });
});
