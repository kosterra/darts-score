import { MAX_PLAYERS, MIN_PLAYERS } from '../../../utils/player.picker';
import { t } from '../../../utils/i18n';

// "3 games" in the language of the app (the word in English, as the key of its texts)
const plural = (count, word) => t(count === 1 ? `{{count}} ${word}` : `{{count}} ${word}s`, { count });

// "Anna vs Ben", or "Anna, Ben and Cleo"
export const playersSummary = (players) => {
    const names = players.map(player => player.nickname);
    if (names.length <= 2) return names.join(' vs ');
    return t('{{join}} and {{at}}', { join: names.slice(0, -1).join(', '), at: names.at(-1) });
};

// "First to 1 set · Best of 3 legs"
export const setsLegsSummary = (game) =>
    `${game.setMode} ${plural(game.numberOfSets, 'set')} · ${game.legMode} ${plural(game.numberOfLegs, 'leg')}`;

// what keeps the game from starting, null when it can start
export const missingPlayers = (players) => {
    if (players.length === 0) return t('Choose {{MIN_PLAYERS}} to {{MAX_PLAYERS}} players', { MIN_PLAYERS: MIN_PLAYERS, MAX_PLAYERS: MAX_PLAYERS });
    if (players.length < MIN_PLAYERS) return t('Choose {{value}} more player', { value: MIN_PLAYERS - players.length });
    return null;
};
