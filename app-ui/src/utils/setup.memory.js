import { getActiveClubId } from './service.utils';
import { t } from './i18n';
import { gamePreferences, saveGamePreferences } from './game.preferences';

// The last setup of each game type in this club, so the usual game is one tap
// away. Kept in this browser (a club device remembers its own) and with the
// player's account, so it follows them to every device: the newer one counts.

const keyOf = (type) => `oche.lastSetup.${getActiveClubId() || 'none'}.${type}`;

const fromDevice = (type) => {
    try {
        const saved = JSON.parse(localStorage.getItem(keyOf(type)));
        return saved && typeof saved === 'object' ? saved : null;
    } catch {
        return null;
    }
};

const fromAccount = (type) => gamePreferences().setups?.[getActiveClubId()]?.[type] ?? null;
// a setup forgotten with "Start fresh" is kept as an empty one, so it stays forgotten everywhere
const isEmpty = (setup) => !setup || (!Object.keys(setup.settings ?? {}).length && !(setup.playerIds ?? []).length);

export const loadSetup = (type) => {
    const device = fromDevice(type);
    const account = fromAccount(type);
    const newer = (account?.savedAt ?? 0) > (device?.savedAt ?? 0) ? account : device;
    return isEmpty(newer) ? null : newer;
};

// setup: { settings, playerIds, handicap, friendly }; guests play one game only and are left out
export const saveSetup = (type, { settings, players = [], handicap = null, friendly = false, doubles = false }) => {
    const members = players.filter(player => !player.guest).map(player => player.id);
    const setup = {
        settings,
        friendly,
        // X01 doubles (the teams follow the order of the players)
        ...(doubles ? { doubles: true } : {}),
        playerIds: members,
        handicap: handicap && Object.fromEntries(Object.entries(handicap).filter(([id]) => members.includes(id))),
        savedAt: Date.now(),
    };
    try {
        localStorage.setItem(keyOf(type), JSON.stringify(setup));
    } catch {
        // storage unavailable (private mode): the account still remembers it
    }
    rememberWithAccount(type, setup);
};

export const clearSetup = (type) => {
    try {
        localStorage.removeItem(keyOf(type));
    } catch {
        // nothing to clear
    }
    rememberWithAccount(type, { settings: {}, playerIds: [], savedAt: Date.now() });
};

// the account keeps the setup without the handicap (it belongs to the device's game)
const rememberWithAccount = (type, { settings, friendly = false, playerIds, savedAt }) => {
    const clubId = getActiveClubId();
    if (!clubId) return;
    const plainSettings = Object.fromEntries(Object.entries(settings ?? {}).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)));
    saveGamePreferences({ setups: { [clubId]: { [type]: { settings: plainSettings, friendly, playerIds, savedAt } } } });
};

/**
 * "Best of" needs two players: with more, the first to win the sets or legs
 * wins, e.g. best of 3 legs becomes first to 2 legs.
 */
export const fitToPlayers = (settings, playerCount) => {
    if (playerCount <= 2) return settings;
    const firstTo = (mode, count) => mode === 'Best of' ? Math.ceil(count / 2) : count;
    return {
        ...settings,
        setMode: 'First to',
        numberOfSets: firstTo(settings.setMode, settings.numberOfSets),
        legMode: 'First to',
        numberOfLegs: firstTo(settings.legMode, settings.numberOfLegs),
    };
};

// common X01 formats, applied with one tap
export const X01_QUICK_FORMATS = [
    {
        id: 'app-501-do-legs',
        name: t('501 Double Out · Best of 3 legs'),
        settings: { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 },
    },
    {
        id: 'app-501-do-sets',
        name: t('501 Double Out · Best of 3 sets'),
        settings: { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 3, legMode: 'Best of', numberOfLegs: 3 },
    },
    {
        id: 'app-301-dido',
        name: t('301 Double In / Double Out · Best of 3 legs'),
        settings: { startingScore: 301, legInMode: 'Double In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 },
    },
    {
        id: 'app-301-so',
        name: t('Beginners: 301 Straight Out · Best of 3 legs'),
        settings: { startingScore: 301, legInMode: 'Straight In', legOutMode: 'Straight Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 },
    },
];

// whether the game is set up like that format (with more players, its "first to" form)
export const isFormat = (settings, format, playerCount) => {
    const expected = fitToPlayers(format.settings, playerCount);
    return Object.entries(expected).every(([name, value]) => settings[name] === value);
};
