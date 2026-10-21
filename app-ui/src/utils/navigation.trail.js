/**
 * Which page came before each entry of the browser history, by the key of
 * the entry: the up link of a page goes back when that is its parent, so the
 * parent comes back as it was (filters, scroll), and opens it fresh otherwise.
 * After a reload nothing is known, and the parent opens fresh.
 */
const previousOf = new Map();
let current = null;

export const noteLocation = (location, navigationType) => {
    if (navigationType !== 'POP' && !previousOf.has(location.key)) {
        // a replaced entry keeps the page before the one it replaces
        previousOf.set(location.key, navigationType === 'REPLACE'
            ? previousOf.get(current?.key) ?? null
            : current ? `${current.pathname}${current.search}` : null);
    }
    current = location;
};

export const previousPathOf = (key) => previousOf.get(key) ?? null;
