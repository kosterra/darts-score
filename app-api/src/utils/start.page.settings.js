import db from '../models/db.model.js';

// What the public start page shows, set by the global admins (one setting,
// "startPage"): the numbers of the installation only once they speak for it.
const KEY = 'startPage';
export const START_PAGE_DEFAULTS = { showNumbers: false };
// the public page is read often: the setting at most once a minute
const CACHE_MS = 60 * 1000;

let cached = null;

const settingsOf = (value) => ({ showNumbers: value?.showNumbers === true });

/**
 * The settings of the start page: { showNumbers }.
 */
export const getStartPageSettings = async () => {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.settings;
    const setting = await db.setting.findOne({ key: KEY }).lean();
    const settings = settingsOf(setting?.value ?? START_PAGE_DEFAULTS);
    cached = { at: Date.now(), settings };
    return settings;
};

export const saveStartPageSettings = async (changes) => {
    const settings = settingsOf({ ...(await getStartPageSettings()), ...changes });
    await db.setting.updateOne({ key: KEY }, { $set: { value: settings } }, { upsert: true });
    cached = { at: Date.now(), settings };
    return settings;
};
