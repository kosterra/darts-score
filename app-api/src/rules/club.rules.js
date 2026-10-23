/**
 * The settings of every game a club can set its own rules for: the choices,
 * the app's default, and which of them are house rules (how the game is
 * counted). A club keeps, per game, its defaults, the choices it offers and
 * the settings it locks; its own formats; whether friendly games may be
 * chosen; its handicap policy and whether the ways out are shown.
 *
 * Plain data and functions without texts: the API keeps an identical copy
 * (see shared.js) to refuse a game against a locked rule. The texts of the
 * setups and the club's editor are in utils/club.rules.labels.js.
 */

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

// restrict: the club may offer a part of the choices only; house: changes how the game is counted
export const GAME_SETTINGS = {
    x01: [
        { key: 'startingScore', values: [101, 170, 201, 301, 401, 501, 701, 1001], default: 501, restrict: true },
        { key: 'legInMode', values: ['Straight In', 'Double In', 'Master In'], default: 'Straight In', restrict: true },
        { key: 'legOutMode', values: ['Straight Out', 'Double Out', 'Master Out'], default: 'Double Out', restrict: true },
        { key: 'setMode', values: ['Best of', 'First to'], default: 'Best of', restrict: true },
        { key: 'numberOfSets', values: range(1, 11), default: 1 },
        { key: 'legMode', values: ['Best of', 'First to'], default: 'Best of', restrict: true },
        { key: 'numberOfLegs', values: range(1, 11), default: 3 },
        // who starts the next leg: the next player in turn, or the loser of the leg (two players)
        { key: 'legStarter', values: ['rotate', 'loser'], default: 'rotate', house: true, restrict: true },
        // after so many rounds of a leg the fewest points left win it; 0: no limit
        { key: 'roundLimit', values: [0, 15, 20, 25, 30], default: 0, house: true, restrict: true },
        // the outer bull 25 and the bullseye 50, or both 50
        { key: 'bull', values: ['split', 'fifty'], default: 'split', house: true, restrict: true },
    ],
    cricket: [
        { key: 'variant', values: ['Standard', 'Cut-throat', 'No-score'], default: 'Standard', restrict: true },
        // after so many rounds the game is decided on the score (or the numbers closed); 0: no limit
        { key: 'roundLimit', values: [0, 15, 20, 25], default: 0, house: true, restrict: true },
    ],
    elimination: [
        { key: 'targetScore', values: [101, 170, 201, 301, 401, 501, 701, 1001], default: 301, restrict: true },
        { key: 'gameInMode', values: ['Straight In', 'Double In', 'Master In'], default: 'Straight In', restrict: true },
        { key: 'gameOutMode', values: ['Straight Out', 'Double Out', 'Master Out'], default: 'Double Out', restrict: true },
    ],
    clock: [
        { key: 'mode', values: ['Single', 'Double', 'Triple', 'All'], default: 'All', restrict: true },
        { key: 'skipAhead', values: [false, true], default: false, house: true },
    ],
    shanghai: [
        { key: 'rounds', values: [7, 20], default: 7, restrict: true },
        // a single, double and treble of the number in one visit wins at once, or only scores
        { key: 'instantWin', values: [true, false], default: true, house: true },
    ],
    killer: [
        { key: 'lives', values: [3, 5], default: 3, restrict: true },
        // what makes a player a killer: the double of their number, or any hit on it
        { key: 'become', values: ['double', 'any'], default: 'double', house: true },
        // a killer hitting their own double: loses a life, or nothing happens
        { key: 'ownDouble', values: ['lose', 'safe'], default: 'lose', house: true },
    ],
    halveit: [
        // the classic nine rounds, a short six, or the club's own targets
        { key: 'targets', values: ['classic', 'short', 'club'], default: 'classic', house: true, restrict: true },
    ],
    golf: [
        { key: 'holes', values: [9, 18], default: 9, restrict: true },
    ],
    tactics: [],
};

export const CLUB_GAMES = Object.keys(GAME_SETTINGS);
// the newer games are kept with their kind and their settings inside "settings"
export const RULES_KINDS = ['shanghai', 'killer', 'halveit', 'golf', 'tactics'];

// the targets Halve-It may be played on, in a club's own order
export const HALVE_IT_POOL = [...range(1, 20).map(String), 'double', 'treble', '41', 'bull'];
export const HALVE_IT_CLASSIC = ['20', '16', 'double', '17', 'treble', '18', '41', '19', 'bull'];
export const HALVE_IT_SHORT = ['20', 'double', '18', 'treble', '19', 'bull'];

export const HANDICAP_MODES = ['off', 'offered', 'suggested'];
export const MAX_FORMATS = 20;

const settingOf = (game, key) => GAME_SETTINGS[game]?.find(setting => setting.key === key);
const isValue = (setting, value) => setting.values.some(option => option === value);

// the app's own defaults of a game
export const appDefaults = (game) => Object.fromEntries((GAME_SETTINGS[game] ?? []).map(setting => [setting.key, setting.default]));

/**
 * The club's rules in a sound shape, whatever was stored or sent: unknown
 * games, settings and values are left out, a default or lock must be one of
 * the choices offered, and a format only keeps what its game knows.
 */
export const normalizeClubRules = (raw = {}) => {
    const games = {};
    for (const game of CLUB_GAMES) {
        const sent = raw?.games?.[game] ?? {};
        const offered = {};
        for (const setting of GAME_SETTINGS[game]) {
            if (!setting.restrict || !Array.isArray(sent.offered?.[setting.key])) continue;
            const values = setting.values.filter(value => sent.offered[setting.key].includes(value));
            // offering nothing (or everything) is no restriction
            if (values.length && values.length < setting.values.length) offered[setting.key] = values;
        }
        const allowed = (setting, value) => isValue(setting, value) && (!offered[setting.key] || offered[setting.key].includes(value));
        const defaults = {};
        for (const setting of GAME_SETTINGS[game]) {
            const value = sent.defaults?.[setting.key];
            if (value !== undefined && allowed(setting, value)) defaults[setting.key] = value;
            // a restricted choice without its default: the first one offered
            else if (offered[setting.key] && !offered[setting.key].includes(setting.default)) defaults[setting.key] = offered[setting.key][0];
        }
        const locked = (Array.isArray(sent.locked) ? sent.locked : []).filter(key => settingOf(game, key));
        games[game] = { enabled: sent.enabled !== false, defaults, offered, locked: [...new Set(locked)] };
    }

    const halveItTargets = (Array.isArray(raw?.halveItTargets) ? raw.halveItTargets : [])
        .map(String).filter(target => HALVE_IT_POOL.includes(target)).slice(0, 20);

    const formats = (Array.isArray(raw?.formats) ? raw.formats : [])
        .filter(format => format && CLUB_GAMES.includes(format.game) && typeof format.name === 'string' && format.name.trim())
        .slice(0, MAX_FORMATS)
        .map((format, index) => ({
            id: typeof format.id === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(format.id) ? format.id : `format-${index + 1}`,
            game: format.game,
            name: format.name.trim().slice(0, 60),
            settings: Object.fromEntries(Object.entries(format.settings ?? {})
                .filter(([key, value]) => { const setting = settingOf(format.game, key); return setting && isValue(setting, value); })),
            friendly: format.friendly === true,
        }));

    const handicap = raw?.handicap ?? {};
    return {
        games,
        formats,
        // the app's own quick formats next to the club's
        builtInFormats: raw?.builtInFormats !== false,
        // players may mark a game as friendly in its setup
        friendlyChoice: raw?.friendlyChoice !== false,
        handicap: {
            mode: HANDICAP_MODES.includes(handicap.mode) ? handicap.mode : 'suggested',
            // the most points the starting scores may differ by; 0: no limit
            maxDifference: Number.isInteger(handicap.maxDifference) && handicap.maxDifference >= 0 && handicap.maxDifference <= 1000 ? handicap.maxDifference : 0,
        },
        // the ways out and tips during X01 games
        waysOut: raw?.waysOut !== false,
        halveItTargets,
    };
};

/**
 * The settings a game starts with: the app's defaults, the club's defaults,
 * then what the setup remembers or the player chose (only where the club
 * offers it), and the club's locked rules on top.
 */
export const startingSettings = (game, rules, ...layers) => {
    const club = normalizeClubRules(rules).games[game];
    const settings = { ...appDefaults(game), ...club?.defaults };
    for (const layer of layers) {
        for (const [key, value] of Object.entries(layer ?? {})) {
            const setting = settingOf(game, key);
            if (!setting) { settings[key] = value; continue; }
            if (isValue(setting, value) && (!club?.offered[key] || club.offered[key].includes(value))) settings[key] = value;
        }
    }
    return lockedOn(game, rules, settings);
};

// the locked settings of a game, as the club wants them
export const lockedSettings = (game, rules) => {
    const club = normalizeClubRules(rules).games[game];
    if (!club) return {};
    const settings = { ...appDefaults(game), ...club.defaults };
    return Object.fromEntries(club.locked.map(key => [key, settings[key]]));
};

export const lockedOn = (game, rules, settings) => ({ ...settings, ...lockedSettings(game, rules) });

// the choices of a setting the club offers
export const offeredValues = (game, rules, key) => {
    const setting = settingOf(game, key);
    if (!setting) return [];
    return normalizeClubRules(rules).games[game]?.offered[key] ?? setting.values;
};

// whether settings (all or some of a game's) keep to the club's locks and the choices it offers, e.g. a format
export const fitsRules = (game, rules, settings) => {
    const own = normalizeClubRules(rules).games[game];
    if (!own) return true;
    const locked = lockedSettings(game, rules);
    return Object.entries(settings ?? {}).every(([key, value]) => (!(key in locked) || locked[key] === value) && (!own.offered[key] || own.offered[key].includes(value)));
};

export const isLocked = (game, rules, key) => normalizeClubRules(rules).games[game]?.locked.includes(key) ?? false;
export const isEnabled = (game, rules) => normalizeClubRules(rules).games[game]?.enabled ?? true;

// the settings of a game as it is stored: X01, Cricket, … on the game itself, the newer games in "settings"
export const settingsOfGame = (game, stored) => (RULES_KINDS.includes(game) ? stored?.settings ?? {} : stored ?? {});

// the score of a handicapped player, from their own rules or the game's
const startingScores = (stored) => Object.values(stored?.handicap ?? {}).map(rules => Number(rules?.startingScore)).filter(Number.isFinite);

/**
 * What a new game breaks of the club's rules, as a list of reasons (empty: none):
 * a game the club does not play, a locked setting changed, a choice the club
 * does not offer, a handicap where the club allows none or one too big, or a
 * friendly game where the players may not choose one (stored.format: the
 * club format it was started from).
 */
export const ruleViolations = (game, rules, stored) => {
    const club = normalizeClubRules(rules);
    const own = club.games[game];
    if (!own) return [];
    const problems = [];
    if (!own.enabled) problems.push(`The club does not play ${game}.`);
    const settings = settingsOfGame(game, stored);
    const locked = lockedSettings(game, rules);
    for (const setting of GAME_SETTINGS[game]) {
        const value = settings[setting.key] ?? setting.default;
        if (setting.key in locked && value !== locked[setting.key]) problems.push(`${setting.key} is a club rule: ${locked[setting.key]}.`);
        else if (own.offered[setting.key] && !own.offered[setting.key].includes(value)) problems.push(`The club does not offer ${setting.key} ${value}.`);
    }
    if (game === 'x01' && stored?.handicap) {
        if (club.handicap.mode === 'off') problems.push('The club plays without handicaps.');
        const scores = startingScores(stored);
        if (club.handicap.maxDifference && scores.length && Math.max(...scores) - Math.min(...scores) > club.handicap.maxDifference) {
            problems.push(`The starting scores may differ by ${club.handicap.maxDifference} points at most.`);
        }
    }
    if (game === 'halveit' && settings.targets === 'club' && !club.halveItTargets.length) problems.push('The club has no Halve-It targets of its own.');
    // without the players' choice, a friendly game is one of the club's friendly formats, as it is
    if (stored?.friendly && !club.friendlyChoice) {
        const format = club.formats.find(entry => entry.id === stored.format && entry.game === game && entry.friendly);
        const asFormat = format && Object.entries(format.settings).every(([key, value]) => (settings[key] ?? appDefaults(game)[key]) === value);
        if (!asFormat) problems.push('The club decides which games are friendly.');
    }
    return problems;
};

/**
 * A player's own preferences for playing, kept with their account so they
 * follow them to every device: the ways out (for every player, only the one
 * at the oche, or off), sending a visit by itself after the third dart, a
 * keypad for the left hand, quieter celebrations, board or keypad, favourite
 * formats per game (pinned first), the last setup of each game per club, and
 * how their trainings start.
 */
export const WAYS_OUT = ['all', 'turn', 'off'];
const MAX_SETUP_CLUBS = 10;
const isId = (value) => typeof value === 'string' && /^[A-Za-z0-9._-]{1,60}$/.test(value);
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);

export const normalizeGamePreferences = (raw = {}) => {
    const favourites = {};
    for (const [game, keys] of Object.entries(plain(raw?.favourites) ? raw.favourites : {})) {
        if (isId(game) && Array.isArray(keys)) favourites[game] = [...new Set(keys.filter(key => typeof key === 'string' && key.length <= 80))].slice(0, 3);
    }
    const setups = {};
    for (const [clubId, games] of Object.entries(plain(raw?.setups) ? raw.setups : {}).slice(0, MAX_SETUP_CLUBS)) {
        if (!isId(clubId) || !plain(games)) continue;
        setups[clubId] = {};
        for (const [game, setup] of Object.entries(games).slice(0, 20)) {
            if (!isId(game) || !plain(setup)) continue;
            setups[clubId][game] = {
                // a setup's settings are plain values (numbers, words, yes or no)
                settings: Object.fromEntries(Object.entries(plain(setup.settings) ? setup.settings : {})
                    .filter(([key, value]) => isId(key) && ['string', 'number', 'boolean'].includes(typeof value) && String(value).length <= 40).slice(0, 30)),
                friendly: setup.friendly === true,
                playerIds: (Array.isArray(setup.playerIds) ? setup.playerIds : []).filter(isId).slice(0, 8),
                savedAt: Number.isFinite(setup.savedAt) ? setup.savedAt : 0,
            };
        }
    }
    const training = plain(raw?.training) ? raw.training : {};
    return {
        waysOut: WAYS_OUT.includes(raw?.waysOut) ? raw.waysOut : 'all',
        autoSend: raw?.autoSend === true,
        leftHanded: raw?.leftHanded === true,
        celebrations: raw?.celebrations === 'quiet' ? 'quiet' : 'full',
        inputMode: ['board', 'keypad'].includes(raw?.inputMode) ? raw.inputMode : null,
        favourites,
        setups,
        training: {
            bot: typeof training.bot === 'string' && training.bot.length <= 40 ? training.bot : null,
            atcMode: ['Single', 'Double', 'Triple', 'All'].includes(training.atcMode) ? training.atcMode : null,
            atcScoring: ['Time', 'Darts'].includes(training.atcScoring) ? training.atcScoring : null,
        },
    };
};
