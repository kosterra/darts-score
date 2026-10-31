import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { randomBytes } from 'node:crypto';

// the app reads these at import; set them before importing it. The backups and
// the pictures go to a folder of this run alone, so the drill never touches
// data/ of the working copy
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'legmate-backup-drill-'));
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.SESSION_SECRET ||= '0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MFA_KEY ||= 'abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.BACKUP_DIR = path.join(TMP, 'backups');
process.env.IMG_DIR = path.join(TMP, 'img');

/**
 * The backup and restore drill: proves, against the real Express app and an
 * in-memory MongoDB, that a backup made through the admin endpoints can be
 * put back. Seeds a small installation (an admin, a user, a club with players,
 * a finished X01 game, a legal setting, a picture), backs it up, wrecks it,
 * restores it and compares every collection document by document; then
 * takes the same backup out (download) and in again (upload) and restores
 * from that; and checks what the upload refuses. The logins must survive all
 * of it: a restore logs nobody in or out.
 */

let mongod;
let db;
let app;
let EJSON;
const state = {};

const api = () => supertest(app);
const NAME = /^legmate-\d{8}-\d{6}-(manual|auto|before-restore|upload)\.json\.gz$/;
const PICTURE = path.join('players', 'drill.png');
const RULES = { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', legMode: 'First to', numberOfSets: 1, numberOfLegs: 1 };

// The integration files run one after the other in one process: the sources
// are loaded afresh for each file, mongoose (a dependency) is shared. The models
// another file compiled on it must go before ours are compiled, and ours go
// when we are done, or the next file fails with "Cannot overwrite model".
const forgetModels = async () => {
    const mongoose = (await import('mongoose')).default;
    for (const name of Object.keys(mongoose.models)) mongoose.deleteModel(name);
};

beforeAll(async () => {
    await forgetModels();
    mongod = await MongoMemoryServer.create();
    db = (await import('../../src/models/db.model.js')).default;
    ({ EJSON } = db.mongoose.mongo.BSON);
    await db.mongoose.connect(mongod.getUri());
    app = (await import('../../index.js')).app;
    const { hashPassword } = await import('../../src/utils/auth.utils.js');

    const passwordHash = await hashPassword('Passw0rd!');
    const admin = await db.user.create({ email: 'admin@test.local', firstname: 'Ada', lastname: 'Admin', passwordHash, role: 'globalAdmin' });
    const user = await db.user.create({ email: 'user@test.local', firstname: 'Uli', lastname: 'User', passwordHash });
    const club = await db.club.create({ name: 'Drill Darts Club', admins: [admin._id] });
    const mkPlayer = (nickname, extra = {}) =>
        db.player.create({ nickname, firstname: nickname, lastname: 'Player', clubs: [club._id], dateOfBirth: new Date('1990-05-15'), ...extra });
    const [ann, bob] = await Promise.all([mkPlayer('Ann', { profileImg: 'drill.png' }), mkPlayer('Bob', { user: user._id }), mkPlayer('Cid')]);

    const login = async (email) => {
        const res = await api().post('/api/auth/login').send({ email, password: 'Passw0rd!' });
        if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
        return res.headers['set-cookie'];
    };
    Object.assign(state, {
        admin: await login('admin@test.local'),
        user: await login('user@test.local'),
        club: String(club._id),
        ann: String(ann._id), bob: String(bob._id),
    });
}, 180000);

afterAll(async () => {
    await db?.mongoose.disconnect();
    await mongod?.stop();
    await fsp.rm(TMP, { recursive: true, force: true });
    await forgetModels();
});

// a request as a given identity, optionally in a given club
const as = (cookie, clubId) => {
    const attach = (req) => { req.set('Cookie', cookie); if (clubId) req.set('X-Club-Id', clubId); return req; };
    return {
        get: (path) => attach(api().get(path)),
        post: (path, body) => attach(api().post(path)).send(body ?? {}),
        put: (path, body) => attach(api().put(path)).send(body ?? {}),
        del: (path) => attach(api().delete(path)),
        // a file in a form: attached by the caller (no body of its own)
        upload: (path, file, filename) => attach(api().post(path)).attach('backup', file, { filename, contentType: 'application/gzip' }),
    };
};
const asAdmin = () => as(state.admin, state.club);

// the response as it came, byte for byte
const binary = (req) => req.buffer(true).parse((res, done) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => done(null, Buffer.concat(chunks)));
});

// the records of a backup file, in order
const recordsOf = (buffer) => zlib.gunzipSync(buffer).toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
// a small backup file of our own, of the given records
const backupOf = (records) => zlib.gzipSync(records.map(record => JSON.stringify(record)).join('\n') + '\n');
const HEADER = { type: 'legmate-backup', version: 1, app: null, createdAt: new Date().toISOString() };

const inBackupDir = async () => (await fsp.readdir(process.env.BACKUP_DIR)).sort();

/**
 * Every collection of the database as it is now, documents in canonical
 * extended JSON (so ObjectIds, dates and numbers compare exactly), sorted by
 * id: { [collection]: [doc, …] }. The logins are left out: they are not part
 * of a backup and the drill checks them on their own.
 */
const snapshot = async () => {
    const conn = db.mongoose.connection.db;
    const names = (await conn.listCollections({}, { nameOnly: true }).toArray()).map(entry => entry.name).filter(name => name !== 'sessions').sort();
    const out = {};
    for (const name of names) {
        const docs = await conn.collection(name).find({}).toArray();
        out[name] = docs.map(doc => EJSON.serialize(doc, { relaxed: false })).sort((a, b) => JSON.stringify(a._id).localeCompare(JSON.stringify(b._id)));
    }
    return out;
};
// the logins as they are: what identifies them and when they end (the last use moves by itself)
const sessions = async () => (await db.session.find({}).sort({ sid: 1 }).lean()).map(({ sid, user, v, expiresAt }) => ({ sid, user: String(user), v, expiresAt: expiresAt.toISOString() }));

describe('the installation to back up', () => {
    it('is seeded: a finished X01 game, a legal setting and a picture', async () => {
        // Ann wins 501 in nine darts, Bob scores 20s: a finished leg, worked out by the server
        const visits = [
            { player: state.ann, darts: ['T20', 'T20', 'T20'] }, { player: state.bob, darts: ['S20', 'S20', 'S20'] },
            { player: state.ann, darts: ['T20', 'T20', 'T20'] }, { player: state.bob, darts: ['S20', 'S20', 'S20'] },
            { player: state.ann, darts: ['T20', 'T19', 'D12'] },
        ];
        const game = await asAdmin().post('/api/games/x01', { ...RULES, players: [state.ann, state.bob], numberOfPlayers: 2, visits });
        expect(game.status).toBe(201);
        expect(game.body.hasWinner).toBe(true);
        expect(game.body.gameIsRunning).toBe(false);
        state.game = String(game.body.id ?? game.body._id);

        const legal = await asAdmin().put('/api/admin/legal', { operator: 'Drill Darts Club', address: 'Oche Lane 1, 8000 Zürich', email: 'legal@test.local', notes: { en: 'Kept for the drill.' } });
        expect(legal.status).toBe(200);
        expect(legal.body.operator).toBe('Drill Darts Club');

        state.picture = randomBytes(2048);
        await fsp.mkdir(path.dirname(path.join(process.env.IMG_DIR, PICTURE)), { recursive: true });
        await fsp.writeFile(path.join(process.env.IMG_DIR, PICTURE), state.picture);
    });

    it('is for global admins only', async () => {
        expect((await as(state.user).get('/api/admin/backups')).status).toBe(403);
        expect((await as(state.user).post('/api/admin/backups')).status).toBe(403);
    });
});

describe('a manual backup', () => {
    it('is written as a gzip file named after its time and kind, without the logins', async () => {
        const res = await asAdmin().post('/api/admin/backups');
        expect(res.status).toBe(201);
        expect(res.body.kind).toBe('manual');
        expect(res.body.name).toMatch(NAME);
        expect(res.body.counts.files).toBe(1);
        state.backup = res.body.name;
        // the world as it is in the backup, to compare with after the restore
        state.world = await snapshot();
        state.logins = await sessions();
        expect(state.logins.length).toBe(2);

        const file = path.join(process.env.BACKUP_DIR, state.backup);
        const bytes = await fsp.readFile(file);
        expect(bytes.length).toBe(res.body.size);
        // the gzip magic number
        expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b]);

        const records = recordsOf(bytes);
        expect(records[0]).toMatchObject({ type: 'legmate-backup', version: 1 });
        expect(records.at(-1).type).toBe('end');
        const collections = records.filter(record => record.type === 'collection').map(record => record.c);
        expect(collections).not.toContain('sessions');
        expect(records.some(record => record.c === 'sessions')).toBe(false);
        // the seeded data is in it, document by document
        for (const name of ['users', 'clubs', 'players', 'x01', 'settings']) expect(collections).toContain(name);
        for (const [name, docs] of Object.entries(state.world)) {
            expect(records.filter(record => record.c === name && record.d).map(record => record.d)).toEqual(expect.arrayContaining(docs));
        }
        // and the picture, as it is
        const picture = records.find(record => record.f);
        expect(picture.f).toBe('players/drill.png');
        expect(Buffer.from(picture.b, 'base64').equals(state.picture)).toBe(true);
    });

    it('is listed and downloads byte for byte', async () => {
        const list = await asAdmin().get('/api/admin/backups');
        expect(list.status).toBe(200);
        expect(list.body.backups.map(entry => entry.name)).toContain(state.backup);

        const download = await binary(asAdmin().get(`/api/admin/backups/${state.backup}`));
        expect(download.status).toBe(200);
        expect(download.headers['content-disposition']).toContain(state.backup);
        expect(download.body.equals(await fsp.readFile(path.join(process.env.BACKUP_DIR, state.backup)))).toBe(true);
        state.downloaded = download.body;
    });
});

describe('the world changes, then the backup is restored', () => {
    it('the game and a player go, the club is renamed, the picture is lost, a new player arrives', async () => {
        expect((await asAdmin().del(`/api/games/x01/${state.game}`)).status).toBe(200);
        expect((await asAdmin().del(`/api/players/${state.bob}`)).status).toBe(200);
        await db.club.updateOne({ _id: state.club }, { $set: { name: 'Renamed Darts Club' } });
        await fsp.rm(path.join(process.env.IMG_DIR, PICTURE));
        const dave = await db.player.create({ nickname: 'Dave', firstname: 'Dave', lastname: 'Player', clubs: [state.club], dateOfBirth: new Date('1988-01-02') });
        state.dave = String(dave._id);

        expect(await db.x01.countDocuments({})).toBe(0);
        expect(await db.player.countDocuments({})).toBe(3);
        expect(await snapshot()).not.toEqual(state.world);
    });

    it('a restore wants the word RESTORE, and changes nothing without it', async () => {
        const before = await snapshot();
        const res = await asAdmin().post(`/api/admin/backups/${state.backup}/restore`, { confirm: 'yes' });
        expect(res.status).toBe(422);
        expect(await snapshot()).toEqual(before);
    });

    it('the restore brings every collection and the picture back, after a backup of the state before', async () => {
        const res = await asAdmin().post(`/api/admin/backups/${state.backup}/restore`, { confirm: 'RESTORE' });
        expect(res.status).toBe(200);
        expect(res.body.restart).toBe(false);
        expect(res.body.counts.files).toBe(1);
        expect(res.body.before).toMatch(/-before-restore\.json\.gz$/);

        // every collection as it was, document by document, field by field
        expect(await snapshot()).toEqual(state.world);
        expect(await db.x01.countDocuments({ _id: state.game })).toBe(1);
        expect(await db.player.countDocuments({ _id: state.bob })).toBe(1);
        expect(await db.player.countDocuments({ _id: state.dave })).toBe(0);
        expect((await db.club.findById(state.club).lean()).name).toBe('Drill Darts Club');
        // the picture, with the same bytes
        expect((await fsp.readFile(path.join(process.env.IMG_DIR, PICTURE))).equals(state.picture)).toBe(true);

        // the state before the restore was kept: the wrecked world is in it
        const beforeFile = path.join(process.env.BACKUP_DIR, res.body.before);
        const records = recordsOf(await fsp.readFile(beforeFile));
        expect(records.find(record => record.c === 'clubs' && record.d)?.d.name).toBe('Renamed Darts Club');
        expect(records.some(record => record.c === 'players' && record.d?.nickname === 'Dave')).toBe(true);
        expect(records.some(record => record.c === 'x01' && record.d)).toBe(false);
        const list = await asAdmin().get('/api/admin/backups');
        expect(list.body.backups.find(entry => entry.name === res.body.before)?.kind).toBe('before-restore');
    });

    it('logs nobody in or out', async () => {
        expect(await sessions()).toEqual(state.logins);
        expect((await asAdmin().get('/api/admin/backups')).status).toBe(200);
        expect((await as(state.user).get('/api/auth/me')).status).toBe(200);
    });
});

describe('a backup brought back from elsewhere', () => {
    it('uploads as kind "upload" and restores too', async () => {
        const upload = await asAdmin().upload('/api/admin/backups/upload', state.downloaded, 'legmate-from-the-nas.json.gz');
        expect(upload.status).toBe(201);
        expect(upload.body.kind).toBe('upload');
        expect(upload.body.name).toMatch(NAME);
        expect(upload.body.size).toBe(state.downloaded.length);
        state.upload = upload.body.name;
        const list = await asAdmin().get('/api/admin/backups');
        expect(list.body.backups.find(entry => entry.name === state.upload)?.kind).toBe('upload');

        // wreck the world again, restore from the upload
        await db.club.updateOne({ _id: state.club }, { $set: { name: 'Renamed Again' } });
        await db.setting.deleteOne({ key: 'legal' });
        await fsp.rm(path.join(process.env.IMG_DIR, PICTURE));
        const res = await asAdmin().post(`/api/admin/backups/${state.upload}/restore`, { confirm: 'RESTORE' });
        expect(res.status).toBe(200);
        expect(await snapshot()).toEqual(state.world);
        expect((await fsp.readFile(path.join(process.env.IMG_DIR, PICTURE))).equals(state.picture)).toBe(true);
        expect(await sessions()).toEqual(state.logins);
    });
});

describe('what is refused', () => {
    const unchanged = async (work) => {
        const [world, files] = [await snapshot(), await inBackupDir()];
        await work();
        expect(await snapshot()).toEqual(world);
        expect(await inBackupDir()).toEqual(files);
    };

    it('a corrupt gzip', () => unchanged(async () => {
        const res = await asAdmin().upload('/api/admin/backups/upload', randomBytes(4096), 'legmate-20260101-000000-manual.json.gz');
        expect(res.status).toBe(422);
    }));

    it('a gzip that is not a backup of Legmate', () => unchanged(async () => {
        const res = await asAdmin().upload('/api/admin/backups/upload', backupOf([{ type: 'collection', c: 'users' }, { c: 'users', d: { email: 'x@y.z' } }]), 'other.json.gz');
        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual(['This file is not a backup of Legmate.']);
    }));

    it('an upload without a file', () => unchanged(async () => {
        expect((await asAdmin().post('/api/admin/backups/upload')).status).toBe(422);
    }));

    it('a bad name, for a restore, a download and a delete', () => unchanged(async () => {
        for (const name of ['legmate-20260101-000000-evil.json.gz', 'backup.json.gz', '..%2F..%2Fetc%2Fpasswd', 'legmate-20260101-000000-manual.json.gz.part']) {
            expect((await asAdmin().post(`/api/admin/backups/${name}/restore`, { confirm: 'RESTORE' })).status).toBeGreaterThanOrEqual(400);
            expect((await asAdmin().post(`/api/admin/backups/${name}/restore`, { confirm: 'RESTORE' })).status).toBeLessThan(500);
            expect((await asAdmin().get(`/api/admin/backups/${name}`)).status).toBeGreaterThanOrEqual(400);
            expect((await asAdmin().del(`/api/admin/backups/${name}`)).status).toBeGreaterThanOrEqual(400);
        }
        // a well-formed name of a backup that is not there
        expect((await asAdmin().post('/api/admin/backups/legmate-20200101-000000-manual.json.gz/restore', { confirm: 'RESTORE' })).status).toBe(422);
        expect((await asAdmin().get('/api/admin/backups/legmate-20200101-000000-manual.json.gz')).status).toBe(404);
    }));

    it('two uploads within one second keep both files; a refused one takes nothing with it', async () => {
        // the names carry the second: freeze the clock (Date only, the timers keep running)
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date());
        try {
            const files = await inBackupDir();
            const first = await asAdmin().upload('/api/admin/backups/upload', state.downloaded, 'one.json.gz');
            const second = await asAdmin().upload('/api/admin/backups/upload', state.downloaded, 'two.json.gz');
            expect(first.status).toBe(201);
            expect(second.status).toBe(201);
            expect(second.body.name).not.toBe(first.body.name);
            const refused = await asAdmin().upload('/api/admin/backups/upload', randomBytes(1024), 'bad.json.gz');
            expect(refused.status).toBe(422);
            const now = await inBackupDir();
            expect(now).toEqual([...files, first.body.name, second.body.name].sort());
            for (const name of [first.body.name, second.body.name]) expect((await asAdmin().del(`/api/admin/backups/${name}`)).status).toBe(200);
        } finally {
            vi.useRealTimers();
        }
    });

    it('a backup with a collection this version does not know: taken in, restored beside the known ones', async () => {
        // The upload checks the header only, and the restore puts back whatever collections the
        // file has (a backup of a newer version may well have one more). What matters: the known
        // collections and the logins are untouched by the stray one.
        const stray = backupOf([HEADER, { type: 'collection', c: 'drillstray' }, { c: 'drillstray', d: { _id: { $oid: '65f000000000000000000001' }, note: 'stray' } }, { type: 'end', counts: {} }]);
        const upload = await asAdmin().upload('/api/admin/backups/upload', stray, 'stray.json.gz');
        expect(upload.status).toBe(201);
        const world = await snapshot();
        const res = await asAdmin().post(`/api/admin/backups/${upload.body.name}/restore`, { confirm: 'RESTORE' });
        expect(res.status).toBe(200);
        expect(res.body.counts.collections).toEqual({ drillstray: 1 });
        const after = await snapshot();
        expect(after.drillstray).toEqual([{ _id: { $oid: '65f000000000000000000001' }, note: 'stray' }]);
        delete after.drillstray;
        expect(after).toEqual(world);
        expect(await sessions()).toEqual(state.logins);
        await db.mongoose.connection.db.dropCollection('drillstray');
        expect((await asAdmin().del(`/api/admin/backups/${upload.body.name}`)).status).toBe(200);
    });

    it('a backup that names the logins: they stay as they are', async () => {
        const withLogins = backupOf([HEADER, { type: 'collection', c: 'sessions' }, { c: 'sessions', d: { sid: 'planted', user: { $oid: '65f000000000000000000002' }, expiresAt: { $date: '2099-01-01T00:00:00Z' } } }, { type: 'end', counts: {} }]);
        const upload = await asAdmin().upload('/api/admin/backups/upload', withLogins, 'logins.json.gz');
        expect(upload.status).toBe(201);
        const res = await asAdmin().post(`/api/admin/backups/${upload.body.name}/restore`, { confirm: 'RESTORE' });
        expect(res.status).toBe(200);
        expect(res.body.counts.collections).toEqual({});
        expect(await sessions()).toEqual(state.logins);
        expect(await snapshot()).toEqual(state.world);
        expect((await asAdmin().del(`/api/admin/backups/${upload.body.name}`)).status).toBe(200);
    });
});
