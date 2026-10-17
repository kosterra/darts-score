import db from '../models/db.model.js';
import { onWarningOrError } from '../models/logger.model.js';

// Logged before the database is connected, saved once it is
const MAX_PENDING = 200;
// A flood of the same error must not fill the database: at most this many
// entries a minute are kept, the rest only goes to the console
const MAX_PER_MINUTE = 120;

// Fields pino adds to every line; the rest is what the caller logged with it
const STANDARD_FIELDS = ['time', 'pid', 'host', 'severity', 'msg', 'err', 'level'];

/**
 * Turns a pino JSON line into an error log entry, or null when it is not one.
 */
export const toLogEntry = (line) => {
    let record;
    try {
        record = JSON.parse(line);
    } catch {
        return null;
    }
    const level = String(record.severity ?? '').toLowerCase();
    if (!['warn', 'error', 'fatal'].includes(level)) return null;

    const context = Object.fromEntries(Object.entries(record).filter(([key]) => !STANDARD_FIELDS.includes(key)));
    const err = record.err;
    return {
        time: record.time ? new Date(record.time) : new Date(),
        level,
        message: String(record.msg ?? err?.message ?? '').slice(0, 2000),
        error: err ? {
            type: String(err.type ?? 'Error'),
            message: String(err.message ?? '').slice(0, 2000),
            stack: String(err.stack ?? '').slice(0, 8000),
        } : undefined,
        context: Object.keys(context).length ? context : null,
    };
};

/**
 * Keeps the API's warnings and errors in the database for the error log.
 * Saving never logs itself, so a broken database cannot loop.
 */
export const startErrorLog = () => {
    const pending = [];
    let minute = 0;
    let savedThisMinute = 0;

    const save = (entry) => db.logEntry.create(entry).catch(() => {});

    const flush = () => {
        while (pending.length) save(pending.shift());
    };

    onWarningOrError((line) => {
        const entry = toLogEntry(line);
        if (!entry) return;

        const now = Math.floor(Date.now() / 60000);
        if (now !== minute) {
            minute = now;
            savedThisMinute = 0;
        }
        if (++savedThisMinute > MAX_PER_MINUTE) return;

        if (db.mongoose.connection.readyState === 1) save(entry);
        else if (pending.length < MAX_PENDING) pending.push(entry);
    });

    db.mongoose.connection.on('connected', flush);
};
