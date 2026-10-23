import { PLAYER_COLORS } from '../components/stats/charts/chart.theme';
import { t } from './i18n';

/**
 * How a player's darts look when they fly onto the board to tap, as they
 * set it on their profile: the colour here, the shapes and designs with
 * what they cost from the API (app-api utils/flights.js), drawn by
 * components/flights/flight.art.
 */
export const FLIGHT_COLORS = [
    { value: '#e5484d', label: t('Red') },
    { value: '#f76b15', label: t('Orange') },
    { value: '#ffc53d', label: t('Yellow') },
    { value: '#46a758', label: t('Green') },
    { value: '#12a594', label: t('Teal') },
    { value: '#0090ff', label: t('Blue') },
    { value: '#8e4ec6', label: t('Purple') },
    { value: '#e93d82', label: t('Pink') },
    { value: '#f2f2f2', label: t('White') },
    { value: '#2b2f36', label: t('Black') },
];

// the second colour of a design: dark on light flights, light on dark ones
export const secondColorOf = (color) => {
    const hex = color.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#2b2f36' : '#f2f2f2';
};

/**
 * The darts of a player in a game: { color, shape, design, barrel }. seat: their
 * place in the game, whose colour "auto" takes. An id the drawings do not
 * know is drawn as the standard shape or the plain design.
 */
export const flightOf = (player, seat = 0) => {
    const preferences = player?.preferences ?? {};
    const own = FLIGHT_COLORS.some(color => color.value === preferences.flightColor);
    return {
        color: own ? preferences.flightColor : PLAYER_COLORS[Math.max(0, seat) % PLAYER_COLORS.length],
        shape: preferences.flightShape || 'standard',
        design: preferences.flightPattern || 'plain',
        barrel: preferences.barrel || 'classic',
    };
};

// whether the darts fly in a game: the game decides, or ('players') the player at the board
export const FLYING_DARTS_OPTIONS = [
    { value: 'players', label: t('Per player') },
    { value: 'on', label: t('On') },
    { value: 'off', label: t('Off') },
];
export const dartsFly = (game, player) => {
    if (game?.flyingDarts === 'on') return true;
    if (game?.flyingDarts === 'off') return false;
    // off unless the player switched it on
    return player?.preferences?.flyingDarts === true;
};
