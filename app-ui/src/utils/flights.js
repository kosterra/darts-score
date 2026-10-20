import { PLAYER_COLORS } from '../components/stats/charts/chart.theme';

/**
 * How a player's darts look when they fly onto the board to tap, as they
 * set it on their profile; the API accepts the same choices
 * (app-api utils/flights.js).
 */
export const FLIGHT_COLORS = [
    { value: '#e5484d', label: 'Red' },
    { value: '#f76b15', label: 'Orange' },
    { value: '#ffc53d', label: 'Yellow' },
    { value: '#46a758', label: 'Green' },
    { value: '#12a594', label: 'Teal' },
    { value: '#0090ff', label: 'Blue' },
    { value: '#8e4ec6', label: 'Purple' },
    { value: '#e93d82', label: 'Pink' },
    { value: '#f2f2f2', label: 'White' },
    { value: '#2b2f36', label: 'Black' },
];

export const FLIGHT_SHAPES = [
    { value: 'standard', label: 'Standard' },
    { value: 'slim', label: 'Slim' },
    { value: 'kite', label: 'Kite' },
    { value: 'pear', label: 'Pear' },
];

export const FLIGHT_PATTERNS = [
    { value: 'plain', label: 'Plain' },
    { value: 'twoTone', label: 'Two-tone' },
    { value: 'tipped', label: 'Tipped' },
    { value: 'striped', label: 'Striped' },
];

// the second colour of a pattern: dark on light flights, light on dark ones
export const secondColorOf = (color) => {
    const hex = color.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#2b2f36' : '#f2f2f2';
};

/**
 * The flights of a player in a game: { color, pattern, shape }. seat: their place
 * in the game, whose colour "auto" takes.
 */
export const flightOf = (player, seat = 0) => {
    const preferences = player?.preferences ?? {};
    const own = FLIGHT_COLORS.some(color => color.value === preferences.flightColor);
    return {
        color: own ? preferences.flightColor : PLAYER_COLORS[Math.max(0, seat) % PLAYER_COLORS.length],
        pattern: FLIGHT_PATTERNS.some(pattern => pattern.value === preferences.flightPattern) ? preferences.flightPattern : 'plain',
        shape: FLIGHT_SHAPES.some(shape => shape.value === preferences.flightShape) ? preferences.flightShape : 'standard',
    };
};

// whether the darts fly in a game: the game decides, or ('players') the player at the board
export const FLYING_DARTS_OPTIONS = [
    { value: 'players', label: 'Per player' },
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
];
export const dartsFly = (game, player) => {
    if (game?.flyingDarts === 'on') return true;
    if (game?.flyingDarts === 'off') return false;
    return player?.preferences?.flyingDarts !== false;
};
