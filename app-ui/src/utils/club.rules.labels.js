import { t, tn } from './i18n';
import { GAME_SETTINGS } from '../rules/club.rules';

// the texts of the club's game rules (rules/club.rules.js has the rules without texts)

export const GAME_TITLES = {
    x01: t('X01'),
    cricket: t('Cricket'),
    elimination: t('Elimination'),
    clock: t('Around the Clock'),
    shanghai: t('Shanghai'),
    killer: t('Killer'),
    halveit: t('Halve-It'),
    golf: t('Golf'),
    tactics: t('Tactics'),
};

export const SETTING_LABELS = {
    startingScore: t('Starting Score'),
    legInMode: t('Starting In'),
    legOutMode: t('Checkout'),
    setMode: t('Sets'),
    numberOfSets: t('Number of sets'),
    legMode: t('Legs'),
    numberOfLegs: t('Number of legs'),
    legStarter: t('Who starts the next leg'),
    roundLimit: t('Round limit'),
    bull: t('Bull'),
    variant: t('Variant'),
    targetScore: t('Starting Score'),
    gameInMode: t('Starting In'),
    gameOutMode: t('Checkout'),
    mode: t('Mode'),
    skipAhead: t('Doubles and trebles move on'),
    rounds: t('Rounds'),
    instantWin: t('A Shanghai wins at once'),
    lives: t('Lives'),
    become: t('Becoming a killer'),
    ownDouble: t('A killer hits their own double'),
    targets: t('Targets'),
    holes: t('Holes'),
};

// what a house rule means, under its choices
export const SETTING_HINTS = {
    legStarter: t('With two players the loser of a leg may start the next one; with more players the next in turn starts.'),
    roundLimit: t('After so many rounds of a leg the fewest points left win it (X01), or the game is decided on the score (Cricket).'),
    bull: t('Soft tip boards often count the outer bull as 50 too.'),
    skipAhead: t('Only with every ring counting: a double moves on two numbers and a treble three.'),
    instantWin: t('A single, double and treble of the number in one visit: the game is won at once, or it just scores.'),
    become: t('What makes a player a killer: the double of their number, or any hit on it.'),
    ownDouble: t('Whether a killer loses a life on their own double.'),
    targets: t('The rounds of Halve-It: the classic nine, a short six, or the club\'s own targets.'),
};

const ON_OFF = { true: t('Yes'), false: t('No') };

/**
 * A choice of a setting in words, e.g. "Loser of the leg" or "20 rounds".
 */
export const valueLabel = (game, key, value) => {
    switch (key) {
        case 'legStarter': return value === 'loser' ? t('The loser of the leg') : t('The next player in turn');
        case 'roundLimit': return value ? tn(value, '{{count}} round', '{{count}} rounds') : t('No limit');
        case 'bull': return value === 'fifty' ? t('Outer bull and bullseye 50') : t('Outer bull 25, bullseye 50');
        case 'skipAhead': case 'instantWin': return ON_OFF[String(value)];
        case 'become': return value === 'any' ? t('Any hit on the number') : t('The double of the number');
        case 'ownDouble': return value === 'safe' ? t('Nothing happens') : t('Loses a life');
        case 'targets': return { classic: t('Classic (9 rounds)'), short: t('Short (6 rounds)'), club: t('The club\'s own') }[value] ?? value;
        case 'numberOfSets': return tn(value, '{{count}} set', '{{count}} sets');
        case 'numberOfLegs': return tn(value, '{{count}} leg', '{{count}} legs');
        case 'rounds': return game === 'shanghai' ? (value === 20 ? t('20 rounds (1 to 20)') : t('7 rounds (1 to 7)')) : tn(value, '{{count}} round', '{{count}} rounds');
        case 'lives': return tn(value, '{{count}} life', '{{count}} lives');
        case 'holes': return tn(value, '{{count}} hole', '{{count}} holes');
        case 'variant': case 'mode': case 'setMode': case 'legMode': return t(String(value));
        default: return String(value);
    }
};

// the choices of a setting as options for a SelectButton or Dropdown
export const settingOptions = (game, key, values = GAME_SETTINGS[game]?.find(setting => setting.key === key)?.values ?? []) =>
    values.map(value => ({ value, label: valueLabel(game, key, value) }));

// a format's settings in words, e.g. "501 · Double Out · Best of 3 legs"
export const settingsSummary = (game, settings) => (GAME_SETTINGS[game] ?? [])
    .filter(setting => settings?.[setting.key] !== undefined)
    .map(setting => `${SETTING_LABELS[setting.key]}: ${valueLabel(game, setting.key, settings[setting.key])}`)
    .join(' · ');
