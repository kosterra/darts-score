/**
 * The newer trainings, each as one definition of the rules engine (see
 * engine.js): Bob's 27, 121 Checkout, Random checkouts, Scoring, Doubles
 * around the board and Catch 40.
 */
import { afterDart, isCheckout } from './darts.js';
import { t, tn } from '../utils/i18n.js';

const DOUBLE_TARGETS = [...Array.from({ length: 20 }, (_, index) => index + 1), 25];
const doubleName = (number) => (number === 25 ? t('Bull') : `D${number}`);
const doubleValue = (number) => number * 2;
const percent = (part, whole) => (whole ? `${Math.round(part / whole * 100)} %` : '–');

/**
 * Bob's 27: start on 27 and throw three darts at every double, D1 to the
 * bull. Each hit adds the double's value; no hit takes it off. Below 1 the
 * training is over.
 */
// what a checkout training has left and the darts for it in this visit (at most
// the darts left of the attempt), for the ways out
const wayOut = (state, darts) => ({ left: state.left, dartsLeft: Math.min(3 - state.inAttempt % 3, darts - state.inAttempt) });

export const BOBS_27 = {
    id: 'bobs27',
    title: t('Bob\'s 27'),
    description: t('Doubles practice: start on 27, three darts at every double from D1 to the bull; a hit adds its value, a visit without one takes it off.'),
    rules: [
        t('You start with 27 points and throw three darts at each double in turn: D1, D2, … D20 and the bull.'),
        t('Every hit adds the value of the double (D1 is 2, the bull 50).'),
        t('A visit without a hit takes the value of the double off. At 0 or below the training is over.'),
        t('The most points at the end are the best: 1,437 is perfect.'),
    ],
    input: 'hitmiss',
    options: [],
    init: () => ({ score: 27, index: 0, inVisit: 0, hitsInVisit: 0, hits: 0, darts: 0, perDouble: [], failed: false }),
    dart: (state, dart) => {
        const number = DOUBLE_TARGETS[state.index];
        state.darts += 1;
        state.inVisit += 1;
        if (dart === 'H') {
            state.hitsInVisit += 1;
            state.hits += 1;
            state.score += doubleValue(number);
        }
        if (state.inVisit === 3) {
            if (state.hitsInVisit === 0) state.score -= doubleValue(number);
            state.perDouble.push(state.hitsInVisit);
            state.index += 1;
            state.inVisit = 0;
            state.hitsInVisit = 0;
            if (state.score <= 0) state.failed = true;
        }
        return state;
    },
    done: (state) => state.failed || state.index >= DOUBLE_TARGETS.length,
    target: (state) => doubleName(DOUBLE_TARGETS[state.index]),
    // the big number of the header
    hero: (state) => state.score,
    status: (state) => [[t('Points'), state.score], [t('Dart'), `${state.inVisit + 1} / 3`]],
    result: (state) => ({ score: state.failed ? 0 : state.score, reached: state.index, hits: state.hits, darts: state.darts, failed: state.failed }),
    higherIsBetter: true,
    format: (score) => tn(score, '{{count}} point', '{{count}} points'),
    figures: (result) => [
        [t('Points'), result.score],
        [t('Hit rate'), percent(result.hits, result.darts)],
        [t('Doubles played'), `${result.reached} / 21`],
    ],
};

/**
 * 121 Checkout: check out the target in nine darts (double out). Done: the
 * target goes up by one; not done: down by one (not below 61). Ten targets.
 */
export const CHECKOUT_121 = {
    id: 'checkout121',
    title: t('121 Checkout'),
    description: t('Check out 121 in nine darts: done, the next target is one higher; not done, one lower. How high do you get?'),
    rules: [
        t('Check out the target with a double in nine darts at most, as in X01 (a bust ends the attempt).'),
        t('Done: the next target is one higher. Not done: one lower, never below 61.'),
        t('After the attempts set the highest target checked out counts.'),
    ],
    input: 'board',
    options: [
        { key: 'attempts', label: t('Attempts'), values: [{ value: 10, label: t('10 attempts') }, { value: 20, label: t('20 attempts') }], default: 10 },
        { key: 'darts', label: t('Darts per attempt'), values: [{ value: 9, label: t('9 darts') }, { value: 6, label: t('6 darts') }], default: 9 },
    ],
    init: () => ({ target: 121, left: 121, inAttempt: 0, attempt: 0, done: 0, best: 0, darts: 0, results: [] }),
    dart: (state, dart, { settings }) => {
        state.darts += 1;
        state.inAttempt += 1;
        const after = afterDart(state.left, dart);
        let finished = null;
        if (after.out) finished = true;
        else if (after.bust || state.inAttempt >= settings.darts) finished = false;
        else state.left = after.left;
        if (finished !== null) {
            state.results.push({ target: state.target, done: finished, darts: state.inAttempt });
            if (finished) {
                state.done += 1;
                state.best = Math.max(state.best, state.target);
                state.target += 1;
            } else {
                state.target = Math.max(61, state.target - 1);
            }
            state.attempt += 1;
            state.left = state.target;
            state.inAttempt = 0;
        }
        return state;
    },
    done: (state, { settings }) => state.attempt >= settings.attempts,
    target: (state) => t('Check out {{left}}', { left: state.left }),
    hero: (state) => state.left,
    checkout: (state, { settings }) => wayOut(state, settings.darts),
    status: (state, { settings }) => [[t('Target'), state.target], [t('Left'), state.left], [t('Attempt'), `${state.attempt + 1} / ${settings.attempts}`], [t('Darts'), `${state.inAttempt} / ${settings.darts}`]],
    result: (state) => ({ score: state.best, done: state.done, attempts: state.attempt, darts: state.darts, last: state.target }),
    higherIsBetter: true,
    format: (score) => (score ? String(score) : '–'),
    figures: (result) => [
        [t('Highest checkout'), result.score || '–'],
        [t('Checked out'), `${result.done} / ${result.attempts}`],
        [t('Next target'), result.last],
    ],
};

// a random finish of 2 to 170 that can be checked out in one visit
const randomCheckout = () => {
    let score = 0;
    while (!isCheckout(score)) score = 2 + Math.floor(Math.random() * 169);
    return score;
};

/**
 * Random checkouts: a random finish (2 to 170) for every attempt, three darts
 * with a double out. The share checked out counts.
 */
export const RANDOM_CHECKOUTS = {
    id: 'randomcheckouts',
    title: t('Random checkouts'),
    description: t('A random finish from 2 to 170 for every attempt, three darts with a double out. How many do you check out?'),
    rules: [
        t('Every attempt gives a random finish between 2 and 170 that can be checked out in one visit.'),
        t('You have three darts to check it out with a double, as in X01; a bust ends the attempt.'),
        t('The share of finishes checked out counts.'),
    ],
    input: 'board',
    options: [{ key: 'attempts', label: t('Attempts'), values: [{ value: 10, label: t('10 attempts') }, { value: 20, label: t('20 attempts') }, { value: 50, label: t('50 attempts') }], default: 10 }],
    // the finishes are drawn when the training starts
    prepare: (settings) => ({ ...settings, targets: Array.from({ length: settings.attempts }, randomCheckout) }),
    init: (settings) => ({ index: 0, left: settings.targets?.[0] ?? 40, inAttempt: 0, done: 0, darts: 0, best: 0, results: [] }),
    dart: (state, dart, { settings }) => {
        const target = settings.targets?.[state.index] ?? 40;
        state.darts += 1;
        state.inAttempt += 1;
        const after = afterDart(state.left, dart);
        let finished = null;
        if (after.out) finished = true;
        else if (after.bust || state.inAttempt >= 3) finished = false;
        else state.left = after.left;
        if (finished !== null) {
            state.results.push({ target, done: finished });
            if (finished) {
                state.done += 1;
                state.best = Math.max(state.best, target);
            }
            state.index += 1;
            state.left = settings.targets?.[state.index] ?? 40;
            state.inAttempt = 0;
        }
        return state;
    },
    done: (state, { settings }) => state.index >= settings.attempts,
    target: (state) => t('Check out {{left}}', { left: state.left }),
    hero: (state) => state.left,
    checkout: (state) => wayOut(state, 3),
    status: (state, { settings }) => [[t('Checked out'), state.done], [t('Attempt'), `${state.index + 1} / ${settings.attempts}`], [t('Dart'), `${state.inAttempt + 1} / 3`]],
    result: (state, { settings }) => ({ score: Math.round(state.done / settings.attempts * 100), done: state.done, attempts: settings.attempts, best: state.best, darts: state.darts }),
    higherIsBetter: true,
    format: (score) => `${score} %`,
    figures: (result) => [
        [t('Checked out'), `${result.done} / ${result.attempts}`],
        [t('Checkout rate'), `${result.score} %`],
        [t('Highest checkout'), result.best || '–'],
    ],
};

/**
 * Scoring: a fixed number of darts, every point counts. The average per
 * visit of three darts counts.
 */
export const SCORING = {
    id: 'scoring',
    title: t('Scoring'),
    description: t('A set number of darts, every point counts: your pure scoring average, without the checkouts.'),
    rules: [
        t('Throw the darts set, aiming where you score most (usually the treble 20).'),
        t('Every point counts; there is no bust and no checkout.'),
        t('The average per visit of three darts counts.'),
    ],
    input: 'board',
    options: [{ key: 'darts', label: t('Darts'), values: [{ value: 30, label: t('30 darts') }, { value: 60, label: t('60 darts') }, { value: 99, label: t('99 darts') }], default: 30 }],
    init: () => ({ points: 0, darts: 0, tons: 0, visit: 0, best: 0 }),
    dart: (state, dart) => {
        state.points += dart.points;
        state.darts += 1;
        state.visit += dart.points;
        if (state.darts % 3 === 0) {
            if (state.visit >= 100) state.tons += 1;
            state.best = Math.max(state.best, state.visit);
            state.visit = 0;
        }
        return state;
    },
    done: (state, { settings }) => state.darts >= settings.darts,
    target: () => t('Score as much as you can'),
    hero: (state) => (state.darts ? (state.points / state.darts * 3).toFixed(1) : '–'),
    status: (state, { settings }) => [[t('Points'), state.points], [t('Average'), state.darts ? (state.points / state.darts * 3).toFixed(1) : '–'], [t('Darts'), `${state.darts} / ${settings.darts}`]],
    result: (state) => ({ score: Math.round(state.points / state.darts * 3 * 10) / 10, points: state.points, darts: state.darts, tons: state.tons, best: state.best }),
    higherIsBetter: true,
    format: (score) => Number(score).toFixed(1),
    figures: (result) => [
        [t('Average'), Number(result.score).toFixed(1)],
        [t('Points'), result.points],
        [t('Ton+ visits'), result.tons],
        [t('Best visit'), result.best],
    ],
};

/**
 * Doubles around the board: every double from D1 to the bull in turn, as
 * many darts as it takes. The fewest darts count.
 */
export const DOUBLES_AROUND = {
    id: 'doublesaround',
    title: t('Doubles around the board'),
    description: t('Every double from D1 to the bull in turn, as many darts as it takes: the fewest darts win, and you see which doubles cost most.'),
    rules: [
        t('Hit D1, then D2, and so on up to D20 and the bull, in this order.'),
        t('Every dart counts, hit or miss; a hit moves on to the next double.'),
        t('The fewest darts are the best: 21 is perfect.'),
    ],
    input: 'hitmiss',
    options: [],
    init: () => ({ index: 0, darts: 0, perDouble: Array(DOUBLE_TARGETS.length).fill(0) }),
    dart: (state, dart) => {
        state.darts += 1;
        state.perDouble[state.index] += 1;
        if (dart === 'H') state.index += 1;
        return state;
    },
    done: (state) => state.index >= DOUBLE_TARGETS.length,
    target: (state) => doubleName(DOUBLE_TARGETS[state.index]),
    hero: (state) => doubleName(DOUBLE_TARGETS[state.index]),
    status: (state) => [[t('Darts'), state.darts], [t('Doubles hit'), `${state.index} / 21`]],
    result: (state) => {
        const hardest = state.perDouble.map((darts, index) => ({ darts, name: doubleName(DOUBLE_TARGETS[index]) })).sort((a, b) => b.darts - a.darts).slice(0, 3);
        return { score: state.darts, perDouble: state.perDouble, hardest: hardest.map(entry => `${entry.name} (${entry.darts})`).join(', ') };
    },
    higherIsBetter: false,
    format: (score) => tn(score, '{{count}} dart', '{{count}} darts'),
    figures: (result) => [
        [t('Darts'), result.score],
        [t('Hit rate'), percent(21, result.score)],
        [t('Hardest doubles'), result.hardest],
    ],
};

/**
 * Catch 40: the finishes 61 to 100, six darts each with a double out.
 * Checked out in two darts: 3 points; in three: 2; in four to six: 1.
 */
export const CATCH_40 = {
    id: 'catch40',
    title: t('Catch 40'),
    description: t('The forty finishes from 61 to 100, six darts each: the faster you check out, the more points.'),
    rules: [
        t('Check out every score from 61 to 100 in turn, with a double as in X01, in six darts at most.'),
        t('Checked out with two darts: 3 points, with three: 2 points, with four to six: 1 point. A bust ends the finish.'),
        t('The most points count: 120 is perfect.'),
    ],
    input: 'board',
    options: [],
    init: () => ({ target: 61, left: 61, inAttempt: 0, points: 0, done: 0, darts: 0 }),
    dart: (state, dart) => {
        state.darts += 1;
        state.inAttempt += 1;
        const after = afterDart(state.left, dart);
        let finished = null;
        if (after.out) finished = true;
        else if (after.bust || state.inAttempt >= 6) finished = false;
        else state.left = after.left;
        if (finished !== null) {
            if (finished) {
                state.done += 1;
                state.points += state.inAttempt <= 2 ? 3 : state.inAttempt === 3 ? 2 : 1;
            }
            state.target += 1;
            state.left = state.target;
            state.inAttempt = 0;
        }
        return state;
    },
    done: (state) => state.target > 100,
    target: (state) => t('Check out {{left}}', { left: state.left }),
    hero: (state) => state.left,
    checkout: (state) => wayOut(state, 6),
    status: (state) => [[t('Points'), state.points], [t('Finish'), `${state.target} (${state.target - 60} / 40)`], [t('Darts'), `${state.inAttempt} / 6`]],
    result: (state) => ({ score: state.points, done: state.done, darts: state.darts }),
    higherIsBetter: true,
    format: (score) => tn(score, '{{count}} point', '{{count}} points'),
    figures: (result) => [
        [t('Points'), result.score],
        [t('Checked out'), `${result.done} / 40`],
    ],
};

export const TRAININGS = [BOBS_27, CHECKOUT_121, RANDOM_CHECKOUTS, SCORING, DOUBLES_AROUND, CATCH_40];
export const trainingOf = (id) => TRAININGS.find(training => training.id === id) ?? null;
