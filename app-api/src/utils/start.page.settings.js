import db from '../models/db.model.js';

// What the public start page shows, set by the global admins (one setting,
// "startPage"): the numbers of the installation only once they speak for it;
// publicSite false for an installation of its own clubs only, which opens
// with the login instead of the page about Oche.
const KEY = 'startPage';
export const START_PAGE_DEFAULTS = { showNumbers: false, publicSite: true };
// the public page is read often: the setting at most once a minute
const CACHE_MS = 60 * 1000;

let cached = null;

const settingsOf = (value) => ({ showNumbers: value?.showNumbers === true, publicSite: value?.publicSite !== false });

/**
 * The settings of the start page: { showNumbers, publicSite }.
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
