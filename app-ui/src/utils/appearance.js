import { ACCENTS, BACKGROUNDS, THEMES, appearanceOf } from '../rules/club.rules';
import { forgetThemeColors } from './palette';

/**
 * How the app looks: the theme (dark, light, like the device, pure black or
 * high contrast), the accent colour (one's own, else the club's, else Oche
 * green) and the background (the dartboard photo, blurred, or plain). Set
 * as data attributes on <html> (see theme/base/_theme-vars.scss), kept on
 * the device too so a page starts in its look before the account is loaded.
 */

export { ACCENTS, BACKGROUNDS, THEMES };

const KEY = 'darts-score.appearance';
export const APPEARANCE_CHANGED = 'darts-score:appearance-changed';

let own = null;
let clubAccent = null;

const deviceLight = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;

// the theme shown: 'auto' follows the device
export const resolvedTheme = (theme) => (theme === 'auto' ? (deviceLight() ? 'light' : 'dark') : theme);

/**
 * Puts the look on the page: the attributes, the colour of the browser's bar,
 * and forgets the colours the charts read.
 */
const apply = () => {
    const look = appearanceOf(own);
    const root = document.documentElement;
    const theme = resolvedTheme(look.theme);
    const accent = look.accent ?? clubAccent ?? 'green';
    if (theme === 'dark') delete root.dataset.theme; else root.dataset.theme = theme;
    if (accent === 'green') delete root.dataset.accent; else root.dataset.accent = accent;
    if (look.background === 'photo') delete root.dataset.background; else root.dataset.background = look.background;
    forgetThemeColors();
    const bar = getComputedStyle(root).getPropertyValue('--c-shade-900').trim();
    if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
    window.dispatchEvent(new Event(APPEARANCE_CHANGED));
};

/**
 * The look one chose (null: the defaults); kept on the device as well.
 */
export const setAppearance = (look) => {
    own = look ? appearanceOf(look) : null;
    try {
        if (own) localStorage.setItem(KEY, JSON.stringify(own));
        else localStorage.removeItem(KEY);
    } catch {
        // without storage the look comes with the account
    }
    apply();
};

// the look in use now (the defaults when none was chosen)
export const currentAppearance = () => appearanceOf(own);

// the club's accent colour, for those who did not choose their own
export const setClubAccent = (accent) => {
    const next = ACCENTS.includes(accent) ? accent : null;
    if (next === clubAccent) return;
    clubAccent = next;
    apply();
};

/**
 * At the start: the look kept on the device, and a theme that follows the
 * device changes along with it.
 */
export const initAppearance = () => {
    try {
        own = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    } catch {
        own = null;
    }
    apply();
    window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
        if (appearanceOf(own).theme === 'auto') apply();
    });
};
