/**
 * The scale of a heatmap, from rarely to often: one colour (the player's) at
 * more or less strength over the dark board: a tenth for a field hit once,
 * the full colour for the one hit most.
 */
const LOWEST = 0.1;

// the strength at a point of the scale, 0 (rarely) to 1 (often)
export const heatOpacity = (at) => LOWEST + (1 - LOWEST) * Math.min(1, Math.max(0, at));

// the scale as a CSS gradient, for its legend: the same strengths
export const heatGradient = (colour) => {
    const stops = [0, 0.25, 0.5, 0.75, 1].map(at => `color-mix(in srgb, ${colour} ${Math.round(heatOpacity(at) * 100)}%, transparent) ${at * 100}%`);
    return `linear-gradient(90deg, ${stops.join(', ')})`;
};
