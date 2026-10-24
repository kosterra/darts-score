// The colours a component needs in JavaScript (charts, inline colours): the
// theme's colours (theme/base/_theme-vars.scss) read from its CSS variables,
// so they follow the theme and the accent colour. Without them (e.g. in
// tests) the default dark theme's, which a test keeps equal to the themes.
// Stylesheets use the tokens; everything else this.

const cache = new Map();

// the value of one of the theme's CSS variables, read once per theme
export const themed = (name, fallback) => {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return fallback;
    if (!cache.has(name)) cache.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);
    return cache.get(name);
};

// the theme or the accent colour changed (see utils/appearance.js)
export const forgetThemeColors = () => cache.clear();

const onLight = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

/**
 * A colour made for the dark themes (a pastel), as it reads on the light
 * one: darkened towards black until text in it stands out on light surfaces.
 * The same colour on the dark themes.
 */
export const readable = (hex) => {
    if (!onLight() || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const darken = (channel) => Math.round(parseInt(channel, 16) * 0.55).toString(16).padStart(2, '0');
    return `#${darken(hex.slice(1, 3))}${darken(hex.slice(3, 5))}${darken(hex.slice(5, 7))}`;
};

export const ACCENT = {
    // good figures: green, whatever the accent colour
    get green() { return themed('--c-positive', '#7ecca5'); },
    get gold() { return themed('--c-accent-gold', '#ffc94d'); },
    get amber() { return themed('--c-accent-amber', '#e9ac2f'); },
    get pink() { return themed('--c-accent-pink', '#e69ac0'); },
    get blue() { return themed('--c-accent-blue', '#4aa8ff'); },
    get red() { return themed('--c-accent-red', '#ec8b80'); },
    get cream() { return themed('--c-accent-cream', '#efe6d0'); },
};

// first, second, third: the medals, the same in every theme
export const PODIUM = ['#ffc94d', '#c9d1d9', '#d29a6a'];

// each game type's colour; the newer games (rules) share one, the trainings take their game's
export const GAME_COLORS = {
    get x01() { return ACCENT.green; },
    get cricket() { return themed('--c-game-cricket', '#d4c783'); },
    get elimination() { return themed('--c-game-elimination', '#c3a9e6'); },
    get clock() { return themed('--c-game-clock', '#86bfe6'); },
    get rules() { return ACCENT.pink; },
    get atc() { return themed('--c-game-clock', '#86bfe6'); },
    get bot() { return ACCENT.green; },
};
