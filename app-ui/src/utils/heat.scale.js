/**
 * The colours of a heatmap, from rarely to often: a dark green, the green of
 * the app, a light green, gold and orange. Several hues rather than one colour
 * at more or less strength, so that fields hit a little more or less than each
 * other still look different, on any screen.
 */
export const HEAT_STOPS = [
    [0, '#24443b'],
    [0.3, '#3f8063'],
    [0.55, '#7ecca5'],
    [0.8, '#ffc94d'],
    [1, '#f08a4b'],
];

const rgb = (hex) => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));

// the colour at a point of the scale, 0 (rarely) to 1 (often)
export const heatColor = (at) => {
    const value = Math.min(1, Math.max(0, at));
    const upper = HEAT_STOPS.findIndex(([stop]) => stop >= value);
    if (upper <= 0) return HEAT_STOPS[0][1];
    const [from, low] = HEAT_STOPS[upper - 1];
    const [to, high] = HEAT_STOPS[upper];
    const share = (value - from) / (to - from);
    const [a, b] = [rgb(low), rgb(high)];
    return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * share)).join(', ')})`;
};

// the scale as a CSS gradient, for its legend
export const HEAT_GRADIENT = `linear-gradient(90deg, ${HEAT_STOPS.map(([stop, colour]) => `${colour} ${stop * 100}%`).join(', ')})`;
