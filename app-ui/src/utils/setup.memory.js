import { getActiveClubId } from './service.utils';
import { t } from './i18n';

// The last setup of each game type in this club, so the usual game is one tap
// away. It lives in this browser only: a club device remembers its own.

const keyOf = (type) => `oche.lastSetup.${getActiveClubId() || 'none'}.${type}`;

export const loadSetup = (type) => {
    try {
        const saved = JSON.parse(localStorage.getItem(keyOf(type)));
        return saved && typeof saved === 'object' ? saved : null;
    } catch {
        return null;
    }
};

// setup: { settings, playerIds, handicap }; guests play one game only and are left out
export const saveSetup = (type, { settings, players = [], handicap = null }) => {
    const members = players.filter(player => !player.guest).map(player => player.id);
    try {
        localStorage.setItem(keyOf(type), JSON.stringify({
            settings,
            playerIds: members,
            handicap: handicap && Object.fromEntries(Object.entries(handicap).filter(([id]) => members.includes(id))),
        }));
    } catch {
        // storage unavailable (private mode): nothing is remembered
    }
};

export const clearSetup = (type) => {
    try {
        localStorage.removeItem(keyOf(type));
    } catch {
        // nothing to clear
    }
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
        name: '501 Double Out · Best of 3 legs',
        settings: { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 },
    },
    {
        name: '501 Double Out · Best of 3 sets',
        settings: { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 3, legMode: 'Best of', numberOfLegs: 3 },
    },
    {
        name: '301 Double In / Double Out · Best of 3 legs',
        settings: { startingScore: 301, legInMode: 'Double In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 },
    },
    {
        name: t('Beginners: 301 Straight Out · Best of 3 legs'),
        settings: { startingScore: 301, legInMode: 'Straight In', legOutMode: 'Straight Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 },
    },
];

// whether the game is set up like that format (with more players, its "first to" form)
export const isFormat = (settings, format, playerCount) => {
    const expected = fitToPlayers(format.settings, playerCount);
    return Object.entries(expected).every(([name, value]) => settings[name] === value);
};
