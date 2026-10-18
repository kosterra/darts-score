// Every way to finish a score with the darts left in the visit, best first.

import checkout from './checkout';

const NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1);
// every dart that scores: singles, doubles, trebles and the bull
const DARTS = [
    ...NUMBERS.map(n => ({ name: `T${n}`, value: n * 3, ring: 'T', number: n })),
    ...NUMBERS.map(n => ({ name: `D${n}`, value: n * 2, ring: 'D', number: n })),
    ...NUMBERS.map(n => ({ name: `S${n}`, value: n, ring: 'S', number: n })),
    { name: 'S25', value: 25, ring: 'S', number: 25 },
    { name: 'D25', value: 50, ring: 'D', number: 25 },
];

// the doubles players like to finish on, best first; the others after them
const DOUBLE_ORDER = [20, 16, 18, 8, 12, 10, 14, 4, 6, 19, 17, 15, 13, 11, 9, 7, 5, 3, 2, 25, 1];
const doubleRank = (number) => {
    const index = DOUBLE_ORDER.indexOf(number);
    return index < 0 ? DOUBLE_ORDER.length : index;
};

// how natural a dart is on the way to the finish: big trebles first, then singles
const setupCost = (dart) => {
    if (dart.ring === 'T') return [20, 19, 18, 17].includes(dart.number) ? 0 : 2;
    if (dart.number === 25) return dart.ring === 'D' ? 4 : 3;
    if (dart.ring === 'S') return 1;
    return 3;
};

// how good the last dart is: the common doubles first; with straight out the
// single, the easiest dart, before the double and the treble
const finalCost = (dart, outMode) => {
    const ring = outMode === 'Straight Out' ? { S: 0, D: 30, T: 60 }[dart.ring] : { D: 0, T: 30, S: 60 }[dart.ring];
    return ring + doubleRank(dart.number);
};

const finishesWith = (dart, outMode) => {
    if (outMode === 'Double Out') return dart.ring === 'D';
    if (outMode === 'Master Out') return dart.ring === 'D' || dart.ring === 'T';
    return true;
};

// "T20  -  T20  -  D25" from the checkout table as ["T20", "T20", "D25"]
const tableRoute = (score) => {
    const entry = checkout[score]?.[0];
    if (!entry || entry.trim().startsWith('---')) return null;
    return entry.trim().split(/\s*-\s*/);
};

/**
 * Every finish of "score" with at most "dartsLeft" darts: [["T20", "T19", "D12"], …].
 * Darts before the last are in any order, so each combination is listed once.
 * Fewest darts first, then natural setup darts (big trebles, singles) and the
 * common doubles, weighed together; with double out
 * the route of the checkout table comes first.
 */
const cache = new Map();

export const checkoutRoutes = (score, { dartsLeft = 3, outMode = 'Double Out' } = {}) => {
    if (!Number.isInteger(score) || score < 1 || score > 180 || dartsLeft < 1) return [];
    // the same score is asked for on every render: work it out once
    const key = `${score}|${dartsLeft}|${outMode}`;
    if (!cache.has(key)) cache.set(key, findRoutes(score, dartsLeft, outMode));
    return cache.get(key);
};

const findRoutes = (score, dartsLeft, outMode) => {
    const finals = DARTS.filter(dart => finishesWith(dart, outMode));
    const found = new Map();
    const add = (setup, last) => {
        // the darts before the last one in a fixed order: one entry per combination
        const ordered = [...setup].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
        const key = [...ordered.map(dart => dart.name), last.name].join(' ');
        if (found.has(key)) return;
        const cost = ordered.reduce((sum, dart) => sum + setupCost(dart), 0);
        found.set(key, { darts: [...ordered, last].map(dart => dart.name), sort: [ordered.length, cost * 3 + finalCost(last, outMode), cost] });
    };

    for (const last of finals) {
        if (last.value === score) add([], last);
        if (dartsLeft < 2) continue;
        for (const first of DARTS) {
            if (first.value + last.value === score) add([first], last);
            if (dartsLeft < 3) continue;
            for (const second of DARTS) {
                if (first.value + second.value + last.value === score) add([first, second], last);
            }
        }
    }

    const routes = [...found.values()]
        .sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1] - b.sort[1] || a.sort[2] - b.sort[2] || a.darts.join().localeCompare(b.darts.join()))
        .map(route => route.darts);

    // the familiar route first, when it can be thrown with the darts left
    const preferred = outMode === 'Double Out' ? tableRoute(score) : null;
    if (preferred && preferred.length <= dartsLeft) {
        const key = (darts) => [...darts.slice(0, -1)].sort().join(' ') + ' > ' + darts.at(-1);
        const index = routes.findIndex(route => key(route) === key(preferred));
        if (index > 0) routes.unshift(routes.splice(index, 1)[0]);
        else if (index < 0) routes.unshift(preferred);
    }
    return routes;
};

// "T20 · T19 · D12"
export const formatRoute = (route) => route.join(' · ');

// the scores worth leaving for the next visit, best first: the common doubles
const GOOD_LEAVES = [40, 32, 36, 24, 16, 20, 8, 12, 50, 28, 18, 10, 4, 38, 34, 30, 26, 22, 14, 6, 2];

// "T19 - T20 - S12 leaves 40" from the checkout table as { darts, leaves, note }
const tableSuggestions = (score) => {
    const entry = checkout[score];
    if (!entry || !entry[0].trim().startsWith('---')) return [];
    return entry.slice(2).map(line => {
        const match = line.match(/^(.*?)\s+leaves\s+(\d+)(.*)$/);
        if (!match) return null;
        return { darts: match[1].trim().split(/\s*-\s*/), leaves: Number(match[2]), note: match[3].replace(/^\s*,\s*/, '').trim() || null };
    }).filter(Boolean);
};

/**
 * What to throw when there is no finish with the darts left: a setup that
 * leaves a good double for the next visit, e.g. [{ darts: ["T19", "T20", "S12"],
 * leaves: 40, note: null }]. From the checkout table with a full visit,
 * worked out otherwise; none when a finish is possible or the score is too
 * high to set up in this visit.
 */
export const setupSuggestions = (score, { dartsLeft = 3, outMode = 'Double Out' } = {}) => {
    // above 170 the way is simply to score: no setup to suggest, as in the checkout table
    if (outMode !== 'Double Out' || !Number.isInteger(score) || score < 3 || score > 170 || dartsLeft < 1) return [];
    if (checkoutRoutes(score, { dartsLeft, outMode }).length) return [];
    if (dartsLeft === 3) {
        const fromTable = tableSuggestions(score);
        if (fromTable.length) return fromTable;
    }
    const found = [];
    for (const leaves of GOOD_LEAVES) {
        const target = score - leaves;
        if (target < 1 || target > 60 * dartsLeft) continue;
        const candidates = [];
        for (const first of DARTS) {
            if (first.value === target) candidates.push([first]);
            if (dartsLeft < 2) continue;
            for (const second of DARTS) {
                if (first.value + second.value === target && first.value >= second.value) candidates.push([first, second]);
                if (dartsLeft < 3) continue;
                for (const third of DARTS) {
                    if (first.value + second.value + third.value === target && first.value >= second.value && second.value >= third.value) candidates.push([first, second, third]);
                }
            }
        }
        if (!candidates.length) continue;
        // natural darts first, and the fewer the better: a dart left over is a free try
        const cost = (darts) => darts.reduce((sum, dart) => sum + setupCost(dart), 0) * 3 + darts.length;
        const best = candidates.sort((a, b) => cost(a) - cost(b))[0];
        found.push({ darts: best.map(dart => dart.name), leaves, note: null });
        if (found.length === 2) break;
    }
    return found;
};
