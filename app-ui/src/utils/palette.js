// The colours a component needs in JavaScript (charts, inline colours): the
// theme's colours (theme/base/_theme-vars.scss) read from its CSS variables,
// so they follow the theme and the accent colour. Without them (e.g. in
// tests) the default dark theme's, which a test keeps equal to the themes.
// Stylesheets use the tokens; everything else this.

const cache = new Map();

// the value of one of the theme's CSS variables, read once per theme
const themed = (name, fallback) => {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return fallback;
    if (!cache.has(name)) cache.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);
    return cache.get(name);
};

// the theme or the accent colour changed (see utils/appearance.js)
export const forgetThemeColors = () => cache.clear();

export const ACCENT = {
    get green() { return themed('--c-primary-lighter', '#7ecca5'); },
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
