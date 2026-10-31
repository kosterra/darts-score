import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { once } from 'node:events';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

/**
 * Backups of the whole installation, for the global admins: every collection
 * of the database (in extended JSON, so ids and dates come back as they
 * were) and the uploaded pictures, in one gzipped file of JSON lines in
 * data/backups. The logins (sessions) stay out: a restore logs nobody in or
 * out. Made by hand, before every restore, or on a schedule that keeps the
 * newest few.
 */

const { EJSON } = db.mongoose.mongo.BSON;
export const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || 'data/backups');
const IMG_DIR = path.resolve(process.env.IMG_DIR || 'data/img');
const SKIP = new Set(['sessions']);
export const KINDS = ['manual', 'auto', 'before-restore', 'upload'];
const NAME = /^legmate-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(manual|auto|before-restore|upload)\.json\.gz$/;
const FORMAT = 'legmate-backup';

const pad = (n) => String(n).padStart(2, '0');
const nameAt = (kind, at) =>
    `legmate-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}-${kind}.json.gz`;
// a name for a new backup of this kind, not taken by a file there already (a second
// upload or restore within the same second would otherwise write over the first)
export const backupName = (kind, now = new Date()) => {
    const at = new Date(now);
    for (;;) {
        const name = nameAt(kind, at);
        if (!fs.existsSync(path.join(BACKUP_DIR, name)) && !fs.existsSync(path.join(BACKUP_DIR, `${name}.part`))) return name;
        at.setSeconds(at.getSeconds() + 1);
    }
};

// a backup as listed: { name, kind, createdAt, size }, or null for any other file
export const parseName = (name) => {
    const m = NAME.exec(name);
    if (!m) return null;
    const [, y, mo, d, h, mi, s, kind] = m;
    return { name, kind, createdAt: new Date(+y, +mo - 1, +d, +h, +mi, +s) };
};

// the path of a backup, only for a name of a backup (nothing else of the server)
export const backupPath = (name) => {
    if (!parseName(name)) throw Object.assign(new Error('There is no such backup.'), { status: 404 });
    return path.join(BACKUP_DIR, name);
};

export const listBackups = async () => {
    await fsp.mkdir(BACKUP_DIR, { recursive: true });
    const names = (await fsp.readdir(BACKUP_DIR)).map(parseName).filter(Boolean);
    const withSize = await Promise.all(names.map(async (entry) => ({ ...entry, size: (await fsp.stat(path.join(BACKUP_DIR, entry.name))).size })));
    return withSize.sort((a, b) => b.createdAt - a.createdAt);
};

// every file below a folder, as paths relative to it
const filesBelow = async (dir, prefix = '') => {
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
    const out = [];
    for (const entry of entries) {
        const rel = path.join(prefix, entry.name);
        if (entry.isDirectory()) out.push(...await filesBelow(path.join(dir, entry.name), rel));
        else if (entry.isFile()) out.push(rel);
    }
    return out;
};

/**
 * Writes a backup of everything now. → { name, kind, createdAt, size, counts }
 */
export const createBackup = async (kind = 'manual', now = new Date()) => {
    await fsp.mkdir(BACKUP_DIR, { recursive: true });
    const name = backupName(kind, now);
    const file = path.join(BACKUP_DIR, name);
    const part = `${file}.part`;
    const gzip = zlib.createGzip({ level: 6 });
    const out = fs.createWriteStream(part);
    gzip.pipe(out);
    const write = async (record) => {
        if (!gzip.write(`${JSON.stringify(record)}\n`)) await once(gzip, 'drain');
    };
    const counts = { collections: {}, files: 0 };
    try {
        await write({ type: FORMAT, version: 1, app: process.env.APP_VERSION || null, createdAt: now.toISOString() });
        const collections = (await db.mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray())
            .map(entry => entry.name).filter(entry => !SKIP.has(entry) && !entry.startsWith('system.')).sort();
        for (const collection of collections) {
            let count = 0;
            await write({ type: 'collection', c: collection });
            for await (const doc of db.mongoose.connection.db.collection(collection).find({})) {
                await write({ c: collection, d: EJSON.serialize(doc, { relaxed: false }) });
                count += 1;
            }
            counts.collections[collection] = count;
        }
        for (const rel of await filesBelow(IMG_DIR)) {
            await write({ f: rel.split(path.sep).join('/'), b: (await fsp.readFile(path.join(IMG_DIR, rel))).toString('base64') });
            counts.files += 1;
        }
        await write({ type: 'end', counts });
        gzip.end();
        await once(out, 'finish');
        await fsp.rename(part, file);
    } catch (err) {
        gzip.destroy(); out.destroy();
        await fsp.rm(part, { force: true });
        throw err;
    }
    const { size } = await fsp.stat(file);
    logger.info(`Backup ${name} written: ${Object.keys(counts.collections).length} collections, ${counts.files} files, ${size} bytes`);
    return { ...parseName(name), size, counts };
};

// the lines of a backup, one after the other. A file that cannot be read (gone
// meanwhile) fails the reading like a corrupt one does, instead of crashing the process
const linesOf = (file) => {
    const gunzip = zlib.createGunzip();
    const input = fs.createReadStream(file).on('error', err => gunzip.destroy(err));
    return readline.createInterface({ input: input.pipe(gunzip), crlfDelay: Infinity });
};

/**
 * Whether a file is a backup of Legmate: its first line says so. → the header, or null
 */
export const readHeader = async (file) => {
    try {
        for await (const line of linesOf(file)) {
            const header = JSON.parse(line);
            return header?.type === FORMAT ? header : null;
        }
    } catch {
        return null;
    }
    return null;
};

/**
 * Puts a backup back: each collection in it replaced by its documents, the
 * pictures written again. Collections not in the backup and the logins stay.
 * A backup of the state before is written first. → { counts, before }
 */
export const restoreBackup = async (name) => {
    const file = backupPath(name);
    if (!(await readHeader(file))) throw Object.assign(new Error('This file is not a backup of Legmate.'), { status: 422 });
    const before = await createBackup('before-restore');
    const conn = db.mongoose.connection.db;
    const counts = { collections: {}, files: 0 };
    let batch = [];
    let current = null;
    const flush = async () => {
        if (batch.length) await conn.collection(current).insertMany(batch, { ordered: false });
        counts.collections[current] = (counts.collections[current] ?? 0) + batch.length;
        batch = [];
    };
    let first = true;
    for await (const line of linesOf(file)) {
        if (!line) continue;
        const record = JSON.parse(line);
        if (first) { first = false; continue; }
        if (record.type === 'collection') {
            if (current) await flush();
            current = record.c;
            if (SKIP.has(current)) { current = null; continue; }
            await conn.collection(current).deleteMany({});
            counts.collections[current] = 0;
        } else if (record.c && current === record.c) {
            batch.push(EJSON.deserialize(record.d, { relaxed: false }));
            if (batch.length >= 500) await flush();
        } else if (record.f) {
            if (current) { await flush(); current = null; }
            const target = path.resolve(IMG_DIR, record.f);
            // nothing outside the pictures' folder, whatever the file says
            if (!target.startsWith(IMG_DIR + path.sep)) continue;
            await fsp.mkdir(path.dirname(target), { recursive: true });
            await fsp.writeFile(target, Buffer.from(record.b, 'base64'));
            counts.files += 1;
        }
    }
    if (current) await flush();
    logger.warn(`Backup ${name} restored: ${Object.keys(counts.collections).length} collections, ${counts.files} files (the state before is in ${before.name})`);
    return { counts, before: before.name };
};

export const deleteBackup = async (name) => {
    await fsp.rm(backupPath(name));
    logger.info(`Backup ${name} deleted`);
};

// the automatic backups beyond the newest `keep` go
export const pruneBackups = async (keep) => {
    const autos = (await listBackups()).filter(entry => entry.kind === 'auto');
    for (const old of autos.slice(keep)) await deleteBackup(old.name);
};

// ---------------------------------------------------------------------------
// The schedule
// ---------------------------------------------------------------------------

const KEY = 'backups';
export const SCHEDULE_DEFAULTS = { enabled: false, frequency: 'daily', hour: 3, weekday: 1, keep: 7 };
export const KEEP_RANGE = { min: 1, max: 60 };

const settingsOf = (value = {}) => ({
    enabled: value.enabled === true,
    frequency: ['daily', 'weekly'].includes(value.frequency) ? value.frequency : SCHEDULE_DEFAULTS.frequency,
    hour: Number.isInteger(value.hour) && value.hour >= 0 && value.hour <= 23 ? value.hour : SCHEDULE_DEFAULTS.hour,
    weekday: Number.isInteger(value.weekday) && value.weekday >= 0 && value.weekday <= 6 ? value.weekday : SCHEDULE_DEFAULTS.weekday,
    keep: Number.isInteger(value.keep) ? Math.min(KEEP_RANGE.max, Math.max(KEEP_RANGE.min, value.keep)) : SCHEDULE_DEFAULTS.keep,
    lastRunAt: value.lastRunAt ?? null,
    lastError: value.lastError ?? null,
});

export const getBackupSettings = async () => settingsOf((await db.setting.findOne({ key: KEY }).lean())?.value);

export const saveBackupSettings = async (changes) => {
    const current = await getBackupSettings();
    const next = settingsOf({ ...current, ...changes });
    await db.setting.updateOne({ key: KEY }, { $set: { value: next } }, { upsert: true });
    return next;
};

/**
 * The newest time a backup was due by the schedule, at or before now (server
 * time): today at the hour (daily) or this week's day at the hour (weekly).
 */
export const lastDueAt = ({ frequency, hour, weekday }, now = new Date()) => {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    if (frequency === 'weekly') at.setDate(at.getDate() - ((at.getDay() - weekday + 7) % 7));
    if (at > now) at.setDate(at.getDate() - (frequency === 'weekly' ? 7 : 1));
    return at;
};

// the next time a backup is due, after now
export const nextDueAt = (settings, now = new Date()) => {
    const last = lastDueAt(settings, now);
    const next = new Date(last);
    next.setDate(next.getDate() + (settings.frequency === 'weekly' ? 7 : 1));
    return next;
};

/**
 * Writes the automatic backup when one is due and none was written since,
 * then keeps the newest few. Notes when it ran, and what went wrong.
 */
export const runScheduledBackup = async (now = new Date()) => {
    const settings = await getBackupSettings();
    if (!settings.enabled) return null;
    const due = lastDueAt(settings, now);
    const lastAuto = (await listBackups()).find(entry => entry.kind === 'auto');
    if (lastAuto && lastAuto.createdAt >= due) return null;
    try {
        const backup = await createBackup('auto', now);
        await pruneBackups(settings.keep);
        await saveBackupSettings({ lastRunAt: now.toISOString(), lastError: null });
        return backup;
    } catch (err) {
        logger.error(err, 'The scheduled backup failed');
        await saveBackupSettings({ lastRunAt: now.toISOString(), lastError: err.message });
        return null;
    }
};

export const startBackupJobs = () => {
    // a few minutes after the start, then every ten minutes: a backup when one is due
    setTimeout(() => runScheduledBackup().catch(err => logger.error(err, 'The backup job failed')), 3 * 60 * 1000).unref();
    setInterval(() => runScheduledBackup().catch(err => logger.error(err, 'The backup job failed')), 10 * 60 * 1000).unref();
};
