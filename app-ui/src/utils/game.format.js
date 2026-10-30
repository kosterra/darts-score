import { GAMES } from '../rules/games';

// the names of the game types, as their tags show them
export const GAME_TYPE_LABELS = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination', clock: 'Around the Clock', ...Object.fromEntries(GAMES.map(game => [game.id, game.title])) };

// the format of a game beside its name, unless it only repeats it (standard Cricket is "Cricket")
export const formatBesideType = (type, format) => (format && format.trim().toLowerCase() !== String(GAME_TYPE_LABELS[type] ?? type).toLowerCase() ? format : null);
