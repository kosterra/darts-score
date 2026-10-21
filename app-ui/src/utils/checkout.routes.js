// Every way to finish a score with the darts left in the visit, best first.

import checkout from './checkout';
import { t } from './i18n';

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

// how good the last dart is: the player's own doubles first (best first), then
// the common doubles; with straight out the single, the easiest dart, before
// the double and the treble
const finalCost = (dart, outMode, doubles = []) => {
    const own = doubles.indexOf(dart.name);
    if (own >= 0) return -12 + own * 2;
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
 * doubles: the player's own doubles, best first, to finish on before the others.
 * Fewest darts first, then natural setup darts (big trebles, singles) and the
 * common doubles, weighed together; with double out
 * the route of the checkout table comes first.
 */
const cache = new Map();

export const checkoutRoutes = (score, { dartsLeft = 3, outMode = 'Double Out', doubles = [] } = {}) => {
    if (!Number.isInteger(score) || score < 1 || score > 180 || dartsLeft < 1) return [];
    // the same score is asked for on every render: work it out once
    const key = `${score}|${dartsLeft}|${outMode}|${doubles.join(',')}`;
    if (!cache.has(key)) cache.set(key, findRoutes(score, dartsLeft, outMode, doubles));
    return cache.get(key);
};

const findRoutes = (score, dartsLeft, outMode, doubles) => {
    const finals = DARTS.filter(dart => finishesWith(dart, outMode));
    const found = new Map();
    const add = (setup, last) => {
        // the darts before the last one in a fixed order: one entry per combination
        const ordered = [...setup].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
        const key = [...ordered.map(dart => dart.name), last.name].join(' ');
        if (found.has(key)) return;
        const cost = ordered.reduce((sum, dart) => sum + setupCost(dart), 0);
        found.set(key, { darts: [...ordered, last].map(dart => dart.name), sort: [ordered.length, cost * 3 + finalCost(last, outMode, doubles), cost] });
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

    // the familiar route first, when it can be thrown with the darts left; the
    // player's own doubles decide instead when they are known
    const preferred = outMode === 'Double Out' && !doubles.length ? tableRoute(score) : null;
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
export const setupSuggestions = (score, { dartsLeft = 3, outMode = 'Double Out', doubles = [] } = {}) => {
    // above 170 the way is simply to score: no setup to suggest, as in the checkout table
    if (outMode !== 'Double Out' || !Number.isInteger(score) || score < 3 || score > 170 || dartsLeft < 1) return [];
    if (checkoutRoutes(score, { dartsLeft, outMode, doubles }).length) return [];
    // the table with a full visit, unless the player's own doubles are known
    const fromTable = dartsLeft === 3 ? tableSuggestions(score) : [];
    if (fromTable.length && !doubles.length) return fromTable;
    // leaving one of the player's doubles comes first
    const ownLeaves = doubles.map(double => DARTS.find(dart => dart.name === double)?.value).filter(Boolean);
    const leavesInOrder = [...new Set([...ownLeaves, ...GOOD_LEAVES])];
    const found = [];
    for (const leaves of leavesInOrder) {
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
    return found.length ? found : fromTable;
};

// the scores that cannot be finished with three darts, and the darts to score with
const BOGEYS = [169, 168, 166, 165, 163, 162, 159];
const SCORING_ORDER = ['T20', 'T19', 'T18', 'T17', 'S20', 'S19'];

// whether one list of sort values comes before another, the first difference deciding
const before = (a, b) => {
    const index = a.findIndex((value, i) => value !== b[i]);
    return index >= 0 && a[index] < b[index];
};

// how good a score is to be left with for the next visit, lower is better
const leaveRank = (leave) => {
    if (leave >= 2 && leave <= 40 && leave % 2 === 0) return 0;
    if (checkoutRoutes(leave, { dartsLeft: 2 }).length) return 1;
    if (checkoutRoutes(leave).length) return 2;
    if (leave > 170) return 3;
    // a bogey number (or 1): the next visit cannot finish
    return 4;
};

/**
 * What to throw when there is neither a finish nor a setup: the darts that
 * leave the best score for the next visit, avoiding the bogey numbers
 * (e.g. 251 → T20 · T20 · T20 leaves 71; 349 → T20 · T20 · T19 leaves 172, not
 * 169), or, still far away, the usual advice. { darts, leaves, advice }
 */
export const scoringTip = (score, { dartsLeft = 3, outMode = 'Double Out', doubles = [], mainTreble = null } = {}) => {
    if (!Number.isInteger(score) || score < 2 || dartsLeft < 1) return null;
    if (checkoutRoutes(score, { dartsLeft, outMode, doubles }).length || setupSuggestions(score, { dartsLeft, outMode, doubles }).length) return null;
    // the treble the player throws at most comes first, the other one is the way round a blocked bed
    const main = mainTreble === 'T19' || mainTreble === 'T18' ? mainTreble : 'T20';
    const other = main === 'T20' ? 'T19' : 'T20';
    const advice = t('Stay on {{main}}; switch to {{other}} if the {{slice}} is blocked.', { main: main, other: other, slice: main.slice(1) });
    const scoring = [main, ...SCORING_ORDER.filter(name => name !== main)].map(name => DARTS.find(dart => dart.name === name));
    if (outMode !== 'Double Out' || score - 60 * dartsLeft > 170) return { darts: null, leaves: null, advice };

    let best = null;
    const consider = (darts) => {
        const leaves = score - darts.reduce((sum, dart) => sum + dart.value, 0);
        if (leaves < 2) return;
        // a good leave first, then the darts players stay on (T20 before T19 …), then the higher score
        const key = [leaveRank(leaves), darts.reduce((sum, dart) => sum + scoring.indexOf(dart), 0), leaves];
        if (!best || before(key, best.key)) best = { key, darts, leaves };
    };
    const pick = (from, count, chosen) => {
        if (chosen.length === count) return consider(chosen);
        for (let index = from; index < scoring.length; index++) pick(index, count, [...chosen, scoring[index]]);
    };
    pick(0, dartsLeft, []);
    if (!best) return { darts: null, leaves: null, advice };
    return { darts: best.darts.map(dart => dart.name), leaves: best.leaves, advice: BOGEYS.includes(score - 60 * dartsLeft) ? t('{{value}} would be a bogey number: no finish in one visit.', { value: score - 60 * dartsLeft }) : null };
};
