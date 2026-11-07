import { useEffect, useLayoutEffect, useRef } from 'react';

// what the darts are entered with: the board, the keypad, the buttons of a training
const INPUT = 'svg.dartboard-img:not(.dartboard-loupe-board), .x01-keypad, .rules-hitmiss, .atc-round-buttons';
// what floats at the bottom of a phone, over the page
const BARS = '.x01-visit-bar.is-floating, .rules-danger-dock, .app-navigation-bar';
const PHONE = '(max-width: 767.98px)';
// a little air between the input and the bar below it
const AIR = 6;
// keys and buttons stay big enough for a thumb
const MIN_KEY = 40;
// a board smaller than this is too fiddly: then it scrolls a little instead
const MIN_BOARD = 220;

const shown = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

// the top of the highest bar floating at the bottom, from the top of the screen
const roomBelow = () => {
    let limit = window.innerHeight;
    document.querySelectorAll(BARS).forEach(bar => {
        if (shown(bar) && getComputedStyle(bar).position === 'fixed') limit = Math.min(limit, bar.getBoundingClientRect().top);
    });
    return limit;
};

const clear = (root) => {
    root.classList.remove('input-tight');
    root.style.removeProperty('--fit-board');
    root.style.removeProperty('--fit-key');
};

/**
 * On a phone the board, the keypad or the buttons are fully in view above the
 * bars at the bottom, without scrolling: when they would not be, the header of
 * the game gets compact (html.input-tight) and the input takes the room left
 * (--fit-board: the size of the board, --fit-key: the height of a key). It
 * stays compact until the phone is turned. ref: an element around the input.
 */
const useInputFit = (ref) => {
    const schedule = useRef(() => {});

    useLayoutEffect(() => {
        const root = document.documentElement;
        const phone = window.matchMedia?.(PHONE);
        let tight = false;
        let size = '';
        let frame = 0;

        const fit = () => {
            frame = 0;
            const input = ref.current && [...ref.current.querySelectorAll(INPUT)].find(shown);
            // the phone turned: measured afresh (not when the browser's bars come and go)
            const turned = `${window.screen?.width}x${window.screen?.height}`;
            if (turned !== size) {
                size = turned;
                tight = false;
                clear(root);
            }
            if (!input || !phone?.matches) return;
            // as if the page were scrolled to the top
            const top = input.getBoundingClientRect().top + window.scrollY;
            const bottom = input.getBoundingClientRect().bottom + window.scrollY;
            const limit = roomBelow() - AIR;
            if (!tight) {
                if (bottom <= limit) return;
                // the compact header first, then measured again with it
                tight = true;
                root.classList.add('input-tight');
                frame = requestAnimationFrame(fit);
                return;
            }
            const room = Math.floor(limit - top);
            if (input.matches('svg')) {
                const width = input.parentElement.getBoundingClientRect().width;
                const board = Math.max(MIN_BOARD, Math.min(width, room));
                if (board < width) root.style.setProperty('--fit-board', `${board}px`);
                else root.style.removeProperty('--fit-board');
                return;
            }
            // the keys: their rows share what is left after the gaps and the rest
            const keys = [...input.querySelectorAll('button')].filter(shown);
            if (!keys.length) return;
            const rows = new Set(keys.map(key => Math.round(key.getBoundingClientRect().top))).size;
            const key = keys[keys.length - 1].getBoundingClientRect().height;
            const rest = input.getBoundingClientRect().height - rows * key;
            const fitting = Math.floor((room - rest) / rows);
            if (fitting < key) root.style.setProperty('--fit-key', `${Math.max(MIN_KEY, fitting)}px`);
            // more room again (the danger zone gone): the keys back to their size, measured once more
            else if (fitting > key + 1 && root.style.getPropertyValue('--fit-key')) {
                root.style.removeProperty('--fit-key');
                schedule.current();
            }
        };
        schedule.current = () => {
            if (!frame) frame = requestAnimationFrame(fit);
        };

        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => schedule.current());
        observer?.observe(document.body);
        window.addEventListener('resize', schedule.current);
        schedule.current();
        return () => {
            cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener('resize', schedule.current);
            clear(root);
        };
    }, [ref]);

    // after every change of the game (a way out, a danger zone, the darts of the visit)
    useEffect(() => schedule.current());
};

export default useInputFit;
