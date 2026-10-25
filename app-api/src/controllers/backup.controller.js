import fsp from 'node:fs/promises';
import logger from '../models/logger.model.js';
import {
    BACKUP_DIR, KEEP_RANGE, backupName, backupPath, createBackup, deleteBackup, getBackupSettings,
    listBackups, nextDueAt, parseName, readHeader, restoreBackup, saveBackupSettings,
} from '../utils/backups.js';

// one backup or restore at a time
let busy = null;
const exclusive = async (what, res, work) => {
    if (busy) return res.status(409).json({ message: 'A backup or a restore is running. Please wait until it is done.' });
    busy = what;
    try {
        return await work();
    } finally {
        busy = null;
    }
};

const scheduleOf = (settings) => ({
    ...settings,
    nextAt: settings.enabled ? nextDueAt(settings) : null,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

/**
 * The backups on the server, newest first, and the schedule. → { backups, schedule, busy }
 */
export const list = async (req, res) => {
    res.json({ backups: await listBackups(), schedule: scheduleOf(await getBackupSettings()), busy });
};

// a backup of everything now
export const create = (req, res) => exclusive('backup', res, async () => {
    const backup = await createBackup('manual');
    logger.info(`Backup ${backup.name} made by ${req.user.email}`);
    res.status(201).json(backup);
});

// the file of a backup, to keep elsewhere
export const download = async (req, res) => {
    const file = backupPath(req.params.name);
    await fsp.access(file).catch(() => { throw Object.assign(new Error('There is no such backup.'), { status: 404 }); });
    res.download(file, req.params.name);
};

export const remove = async (req, res) => {
    await deleteBackup(req.params.name);
    res.json({ message: 'Backup deleted.' });
};

/**
 * Puts a backup back, after a backup of the state before. On a real server
 * the app starts again afterwards, so nothing kept in memory is out of date.
 */
export const restore = (req, res) => exclusive('restore', res, async () => {
    if (req.body.confirm !== 'RESTORE') return res.status(422).json({ errors: ['Type RESTORE to confirm.'] });
    const result = await restoreBackup(req.params.name);
    logger.warn(`Backup ${req.params.name} restored by ${req.user.email}`);
    const restart = process.env.NODE_ENV === 'production';
    res.json({ ...result, restart });
    if (restart) setTimeout(() => process.exit(0), 1500).unref();
});

// a backup file brought from elsewhere: kept next to the others, to restore from
export const uploaded = async (req, res) => {
    if (!req.file) return res.status(422).json({ errors: ['Choose a backup file.'] });
    if (!(await readHeader(req.file.path))) {
        await fsp.rm(req.file.path, { force: true });
        return res.status(422).json({ errors: ['This file is not a backup of Legmate.'] });
    }
    const { size } = await fsp.stat(req.file.path);
    logger.info(`Backup ${req.file.filename} uploaded by ${req.user.email}`);
    res.status(201).json({ ...parseName(req.file.filename), size });
};

export const saveSchedule = async (req, res) => {
    const { enabled, frequency, hour, weekday, keep } = req.body;
    const settings = await saveBackupSettings({ enabled, frequency, hour, weekday, keep });
    logger.info(`Backup schedule set by ${req.user.email}: ${settings.enabled ? `${settings.frequency} at ${settings.hour}:00, keeping ${settings.keep}` : 'off'}`);
    res.json(scheduleOf(settings));
};

export { BACKUP_DIR, KEEP_RANGE, backupName };
