import { normalizeGamePreferences } from '../rules/club.rules';

// The player's own preferences for playing, from their account (see
// rules/club.rules.js), for the parts of the app outside React: the setup
// memory and the way darts are entered. The login state connects them.

let current = normalizeGamePreferences();
let saver = null;

export const connectGamePreferences = (preferences, save) => {
    current = normalizeGamePreferences(preferences);
    saver = save;
};

export const gamePreferences = () => current;

// saved with the account; nothing without a login (e.g. a quick game)
export const saveGamePreferences = (changes) => {
    if (!saver) return Promise.resolve(null);
    // known at once, also before the account answered
    current = normalizeGamePreferences({ ...current, ...changes, setups: changes.setups ? mergeSetups(current.setups, changes.setups) : current.setups });
    return saver(changes).catch(() => null);
};

const mergeSetups = (before, changes) => {
    const merged = { ...before };
    for (const [clubId, games] of Object.entries(changes)) merged[clubId] = { ...before[clubId], ...games };
    return merged;
};
