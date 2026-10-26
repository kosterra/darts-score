/**
 * The shirts of the players. Everyone plays in the shirt of their club (its
 * accent colour, its name on the chest), as amateurs in a league do. From the
 * level Pro on a player may wear a shirt of their own, with their nickname on
 * the back: every design is free, a goodie of the level, and more come with
 * World Class and Legend. A level once reached keeps its shirts, even when the
 * level follows a weaker form down again.
 * The app draws them by their id (app-ui components/shirts).
 */
import { FLIGHT_COLORS } from './flights.js';

export const SHIRT_COLORS = FLIGHT_COLORS;

// level: the player level that opens the design (1 = Rookie, 6 = Pro)
export const SHIRT_DESIGNS = [
    { id: 'club', label: 'Club shirt', level: 1 },
    { id: 'flames', label: 'Flames', level: 6 },
    { id: 'lightning', label: 'Lightning', level: 6 },
    { id: 'chevrons', label: 'Chevrons', level: 6 },
    { id: 'waves', label: 'Waves', level: 6 },
    { id: 'stripes', label: 'Side stripes', level: 6 },
    { id: 'checker', label: 'Checkerboard', level: 6 },
    { id: 'splash', label: 'Splash', level: 7 },
    { id: 'globe', label: 'World stage', level: 7 },
    { id: 'goldTrim', label: 'Gold trim', level: 8 },
    { id: 'laurel', label: 'Laurel', level: 8 },
];
export const PRO_LEVEL = 6;
export const SHIRT_DEFAULTS = { design: 'club', color: '#2b2f36', accent: '#46a758' };

const designOf = (id) => SHIRT_DESIGNS.find(design => design.id === id) ?? null;

/**
 * The highest level a player reached: kept as they played (bestLevel), the
 * level they were last told about, and the current one when it is known.
 */
export const reachedLevel = (player, current = null) =>
    Math.max(1, player?.bestLevel ?? 0, player?.notifiedLevel ?? 0, current ?? 0);

// whether a level opens a design
export const mayWear = (designId, level) => {
    const design = designOf(designId);
    return Boolean(design) && level >= design.level;
};

/**
 * The shirt a player is seen in: their choice where their level allows it,
 * else the club shirt; the colours of their own shirt as they chose them.
 */
export const shirtOf = (player) => {
    const chosen = player?.shirt ?? {};
    const level = reachedLevel(player);
    return {
        design: chosen.design && mayWear(chosen.design, level) ? chosen.design : 'club',
        color: SHIRT_COLORS.includes(chosen.color) ? chosen.color : SHIRT_DEFAULTS.color,
        accent: SHIRT_COLORS.includes(chosen.accent) ? chosen.accent : SHIRT_DEFAULTS.accent,
    };
};

/**
 * Every design with whether the player may wear it, for choosing:
 * { level, shirt, designs: [{ id, label, level, levelName, owned }] }.
 * levels: the player levels (for their names).
 */
export const shirtStanding = (player, { current = null, levels = [] } = {}) => {
    const level = reachedLevel(player, current);
    return {
        level,
        shirt: shirtOf({ ...player, bestLevel: level }),
        designs: SHIRT_DESIGNS.map(design => ({
            id: design.id,
            label: design.label,
            level: design.level,
            levelName: levels[design.level - 1]?.name ?? null,
            owned: level >= design.level,
        })),
    };
};

/**
 * Checking a choice: { ok: true, shirt } or { ok: false, reason }.
 * change: { design, color, accent }, each optional.
 */
export const shirtCheck = (player, change, level) => {
    // the colours as they are now (none chosen yet: the defaults), the design as chosen
    const { color, accent } = shirtOf(player);
    const next = { design: player?.shirt?.design ?? SHIRT_DEFAULTS.design, color, accent, ...change };
    if (!designOf(next.design)) return { ok: false, reason: 'There is no such shirt.' };
    if (!mayWear(next.design, level)) return { ok: false, reason: 'Your level does not open this shirt yet.' };
    if (!SHIRT_COLORS.includes(next.color) || !SHIRT_COLORS.includes(next.accent)) return { ok: false, reason: 'Choose the colours of the shirt from the list.' };
    return { ok: true, shirt: { design: next.design, color: next.color, accent: next.accent } };
};
