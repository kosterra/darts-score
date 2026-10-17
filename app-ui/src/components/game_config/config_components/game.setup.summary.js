import { MAX_PLAYERS, MIN_PLAYERS } from '../../../utils/player.picker';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// "Anna vs Ben", or "Anna, Ben and Cleo"
export const playersSummary = (players) => {
    const names = players.map(player => player.nickname);
    if (names.length <= 2) return names.join(' vs ');
    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};

// "First to 1 set · Best of 3 legs"
export const setsLegsSummary = (game) =>
    `${game.setMode} ${plural(game.numberOfSets, 'set')} · ${game.legMode} ${plural(game.numberOfLegs, 'leg')}`;

// what keeps the game from starting, null when it can start
export const missingPlayers = (players) => {
    if (players.length === 0) return `Choose ${MIN_PLAYERS} to ${MAX_PLAYERS} players`;
    if (players.length < MIN_PLAYERS) return `Choose ${MIN_PLAYERS - players.length} more player`;
    return null;
};
