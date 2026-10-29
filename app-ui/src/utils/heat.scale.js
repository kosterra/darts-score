/**
 * The colours of a heatmap, from rarely to often, in one colour (the
 * player's): from a dark shade of it through the colour itself to a light
 * tint. A scale of lightness rather than of strength over the dark board, so
 * that fields hit a little more or less than each other still look different.
 */
const BOARD = '#262626';
const WHITE = '#ffffff';

const rgb = (hex) => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
const mix = (from, to, share) => {
    const [a, b] = [rgb(from), rgb(to)];
    return a.map((channel, index) => Math.round(channel + (b[index] - channel) * share));
};
const css = (channels) => `rgb(${channels.join(', ')})`;
const hex = (channels) => `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;

// the stops of a colour: a dark shade (a fifth of it over the board), the colour, a light tint
export const heatStops = (colour) => [
    [0, hex(mix(BOARD, colour, 0.22))],
    [0.65, colour],
    [1, hex(mix(colour, WHITE, 0.5))],
];

// the colour at a point of the scale, 0 (rarely) to 1 (often)
export const heatColor = (at, colour) => {
    const stops = heatStops(colour);
    const value = Math.min(1, Math.max(0, at));
    const upper = stops.findIndex(([stop]) => stop >= value);
    if (upper <= 0) return css(rgb(stops[0][1]));
    const [from, low] = stops[upper - 1];
    const [to, high] = stops[upper];
    return css(mix(low, high, (value - from) / (to - from)));
};

// the scale as a CSS gradient, for its legend
export const heatGradient = (colour) => `linear-gradient(90deg, ${heatStops(colour).map(([stop, value]) => `${value} ${stop * 100}%`).join(', ')})`;
