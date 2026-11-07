/**
 * The newer trainings, each as one definition of the rules engine (see
 * engine.js): Bob's 27, 121 Checkout, Random checkouts, Scoring, Doubles
 * around the board, Catch 40, Treble practice, Bull practice, Checkout ladder
 * and Shortest leg.
 */
import { afterDart, isCheckout } from './darts.js';
import { settingsOf } from './engine.js';
import { DOUBLES_BANDS, TREBLES_BANDS } from './levels.play.js';
import { t, tn } from '../utils/i18n.js';

const DOUBLE_TARGETS = [...Array.from({ length: 20 }, (_, index) => index + 1), 25];
const doubleName = (number) => (number === 25 ? t('Bull') : `D${number}`);
const doubleValue = (number) => number * 2;
const percent = (part, whole) => (whole ? `${Math.round(part / whole * 100)} %` : '–');
// a figure of the level a training was played at, as shown beside it (see levels.play.js)
const levelPercent = (value) => `${Math.round(value)} %`;
// The bands of the levels are what a player of a 25, 40, 50, 60, 75 and 90 average scores in the
// training, from the simulated thrower of levels.play.js (where hobby, amateur, semi-pro, pro,
// world class and elite start).
// 121 Checkout by darts per attempt and attempts
const CHECKOUT_121_BANDS = {
    9: { 10: [1, 120, 122, 124, 127, 128], 20: [1, 120, 122, 126, 133, 138], 30: [1, 120, 122, 129, 138, 146], 50: [1, 120, 123, 134, 150, 160] },
    6: { 10: [1, 115, 119, 120, 122, 125], 20: [1, 115, 119, 121, 123, 129], 30: [1, 116, 119, 121, 124, 133], 50: [1, 115, 119, 121, 126, 140] },
};
// Shortest leg by the legs played: the best of ten comes easier than the best of three
const SHORTEST_LEG_BANDS = { 3: [42, 31, 24, 20, 17, 14], 5: [40, 28, 23, 19, 16, 13], 10: [35, 26, 21, 18, 15, 13] };

/**
 * The doubles of a training around the board as cells, D1 to the bull: the
 * ones played with what they took (value) and how good that was (tone, 0 the
 * worst to 3 the best), the one to throw at now (current), the rest to come.
 */
const doubleCells = (state, valueOf, toneOf, over = false) => DOUBLE_TARGETS.map((number, index) => {
    const played = index < state.index;
    const value = played ? valueOf(index) : null;
    return {
        name: doubleName(number),
        short: number === 25 ? t('Bull') : String(number),
        value,
        tone: played ? toneOf(value) : null,
        current: !over && index === state.index,
    };
});

/**
 * Bob's 27: start on 27 and throw three darts at every double, D1 to the
 * bull. Each hit adds the double's value; no hit takes it off. Below 1 the
 * training is over.
 */
// how many visits without a hit in a row, from the double at "from" on, end the
// training at this score (Infinity when even missing every double left does not)
const missesToFail = (score, from) => {
    let left = score;
    for (let index = from; index < DOUBLE_TARGETS.length; index += 1) {
        left -= doubleValue(DOUBLE_TARGETS[index]);
        if (left <= 0) return index - from + 1;
    }
    return Infinity;
};
// how close a score is to the end: 'danger' the next double has to be a hit, 'warn' up to
// three misses in a row end it, 'safe' otherwise
const riskOf = (score, from) => {
    const misses = missesToFail(score, from);
    return misses <= 1 ? 'danger' : misses <= 3 ? 'warn' : 'safe';
};

/**
 * Bob's 27 so far: the points at the start, after every double and now (in a
 * visit), each with how close it is to the end (see riskOf). A double with a
 * hit in this visit is safe already, so it counts from the next one.
 */
export const bobsProgress = (state) => {
    let score = 27;
    const points = [{ score, risk: riskOf(score, 0) }];
    state.perDouble.forEach((hits, index) => {
        const value = doubleValue(DOUBLE_TARGETS[index]);
        score += hits ? hits * value : -value;
        points.push({ score, risk: riskOf(score, index + 1) });
    });
    if (state.inVisit) points.push({ score: state.score, risk: riskOf(state.score, state.hitsInVisit ? state.index + 1 : state.index) });
    return points;
};

// what a checkout training has left and the darts for it in this visit (at most
// the darts left of the attempt), for the ways out
const wayOut = (state, darts) => ({ left: state.left, dartsLeft: Math.min(3 - state.inAttempt % 3, darts - state.inAttempt) });

/**
 * Bob's 27 in the danger zone: without a hit in the darts left at this double
 * the training is over. { double, dartsLeft } (3, 2 or 1) with the words of
 * the strip (text), or null when a miss of the whole visit still leaves
 * points (or this visit has a hit).
 */
export const bobsDanger = (state) => {
    if (state.index >= DOUBLE_TARGETS.length || state.hitsInVisit > 0) return null;
    const number = DOUBLE_TARGETS[state.index];
    if (state.score - doubleValue(number) > 0) return null;
    const dartsLeft = 3 - state.inVisit;
    const double = doubleName(number);
    return { double, dartsLeft, text: tn(dartsLeft, 'Hit {{double}} with your last dart, or the training is over.', 'Hit {{double}} with one of your next {{count}} darts, or the training is over.', { double }) };
};

// how many doubles a saved attempt played (older ones from their darts: three a double)
const reachedOf = (entry) => entry.result?.reached ?? Math.floor((entry.darts?.length ?? 0) / 3);

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
    // the points are the big figure of the header, the double to throw at under them (in the
    // accent), and a curve of the points so far in the colour of how close the end is
    hero: (state) => state.score,
    heroUnit: (state) => (state.score === 1 ? t('point') : t('points')),
    heroNote: (state) => doubleName(DOUBLE_TARGETS[state.index]),
    noteTarget: true,
    progress: bobsProgress,
    danger: bobsDanger,
    // the whole way, D1 to the bull
    progressLength: DOUBLE_TARGETS.length,
    // the darts thrown in this visit
    inVisit: (state) => state.inVisit,
    // the hits of every double, 0 to 3 (a visit without one is the worst)
    doubles: (state) => doubleCells(state, index => state.perDouble[index], hits => hits, state.failed),
    doublesLabel: t('Hits out of 3 per double'),
    // on tiles under the curve (instead of the status): how far it got and the dart of the visit
    heroFigures: (state) => [[t('Double'), `${Math.min(state.index + 1, 21)} / 21`], [t('Dart'), `${state.inVisit + 1} / 3`]],
    status: (state) => [[t('Points'), state.score], [t('Dart'), `${state.inVisit + 1} / 3`]],
    result: (state) => ({ score: state.failed ? 0 : state.score, reached: state.index, hits: state.hits, darts: state.darts, failed: state.failed }),
    higherIsBetter: true,
    // the same points (above all 0, out before the bull): the one that got further first
    tiebreak: (a, b) => reachedOf(b) - reachedOf(a),
    // where an attempt that failed ended, beside its date on the scoreboard
    entryNote: (entry) => (entry.score === 0 && reachedOf(entry) > 0 ? t('out at {{double}}', { double: doubleName(DOUBLE_TARGETS[reachedOf(entry) - 1]) }) : null),
    format: (score) => tn(score, '{{count}} point', '{{count}} points'),
    figures: (result) => [
        [t('Points'), result.score],
        [t('Hit rate'), percent(result.hits, result.darts)],
        [t('Doubles played'), `${result.reached} / 21`],
    ],
    // the points of a run that gets through, as the doubles of the simulated thrower make them (see
    // levels.play.js): about 100 for a 50 average, 285 for 75, 455 for 90. Getting through at all is
    // rare below a 50 average (one run in six there, half of them at 60), so any points are hobby
    // and a run that ends early (0) is the lowest step
    level: { by: t('the points'), of: (result) => result.score, bands: [1, 60, 100, 160, 285, 455] },
};

/**
 * 121 Checkout: check out the target in nine darts (double out). Done: the
 * target goes up by one; not done: down by one (not below 61). 10 to 50
 * attempts: the most attempts are the only way up to 150 and beyond
 * (121 + attempts - 1 at most).
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
        { key: 'attempts', label: t('Attempts'), values: [{ value: 10, label: t('10 attempts') }, { value: 20, label: t('20 attempts') }, { value: 30, label: t('30 attempts') }, { value: 50, label: t('50 attempts') }], default: 10 },
        { key: 'darts', label: t('Darts per attempt'), values: [{ value: 9, label: t('9 darts') }, { value: 6, label: t('6 darts') }], default: 9 },
    ],
    // the attempts set how high one can get, the darts how hard each is
    boards: ['attempts', 'darts'],
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
    // the last visit of an attempt: not checked out, the next target is one lower
    // an attempt ends early when it is checked out or bust: its visits count from its start
    inVisit: (state) => state.inAttempt % 3,
    // on tiles under what is left and the way out (instead of the status)
    heroFigures: (state, { settings }) => [[t('Target'), state.target], [t('Attempt'), `${state.attempt + 1} / ${settings.attempts}`], [t('Darts'), `${state.inAttempt} / ${settings.darts}`]],
    status: (state, { settings }) => [[t('Target'), state.target], [t('Left'), state.left], [t('Attempt'), `${state.attempt + 1} / ${settings.attempts}`], [t('Darts'), `${state.inAttempt} / ${settings.darts}`]],
    result: (state) => ({ score: state.best, done: state.done, attempts: state.attempt, darts: state.darts, last: state.target }),
    higherIsBetter: true,
    format: (score) => (score ? String(score) : '–'),
    figures: (result) => [
        [t('Highest checkout'), result.score || '–'],
        [t('Checked out'), `${result.done} / ${result.attempts}`],
        [t('Next target'), result.last],
    ],
    // the target goes one up or down an attempt, so it settles where about half of the attempts are
    // checked out: the typical highest checkout of the simulated thrower, by the darts and the
    // attempts (more attempts let the better ones climb further); any checkout at all is hobby
    level: {
        by: t('the highest checkout'),
        of: (result) => result.score,
        bands: (result, settings) => {
            const byAttempts = CHECKOUT_121_BANDS[settings?.darts === 6 ? 6 : 9];
            return byAttempts[settings?.attempts] ?? byAttempts[10];
        },
    },
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
    // a share of 10 is easier to get high than one of 50
    boards: ['attempts'],
    // the finishes are drawn when the training starts
    prepare: (settings) => ({ ...settings, targets: Array.from({ length: settings.attempts }, randomCheckout) }),
    // the finishes as prepare draws them: one for every attempt, each one a visit can check out
    prepared: {
        targets: (targets, settings) => Array.isArray(targets) && targets.length === settings.attempts && targets.every(target => Number.isInteger(target) && isCheckout(target)),
    },
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
    // three darts an attempt: only its last dart
    inVisit: (state) => state.inAttempt,
    // on tiles under what is left and the way out (instead of the status)
    heroFigures: (state, { settings }) => [[t('Checked out'), state.done], [t('Attempt'), `${state.index + 1} / ${settings.attempts}`], [t('Dart'), `${state.inAttempt + 1} / 3`]],
    status: (state, { settings }) => [[t('Checked out'), state.done], [t('Attempt'), `${state.index + 1} / ${settings.attempts}`], [t('Dart'), `${state.inAttempt + 1} / 3`]],
    result: (state, { settings }) => ({ score: Math.round(state.done / settings.attempts * 100), done: state.done, attempts: settings.attempts, best: state.best, darts: state.darts }),
    higherIsBetter: true,
    format: (score) => `${score} %`,
    figures: (result) => [
        [t('Checked out'), `${result.done} / ${result.attempts}`],
        [t('Checkout rate'), `${result.score} %`],
        [t('Highest checkout'), result.best || '–'],
    ],
    // over all the finishes from 2 to 170, aimed at the usual way out: about 13 % for a 50 average,
    // 28 % for 75 and 38 % for 90
    level: { by: t('the checkout rate'), of: (result) => result.score, bands: [3, 8, 13, 20, 28, 38], format: levelPercent },
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
    // an average of a few darts swings more than one of many
    boards: ['darts'],
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
    // the points, the average and the darts big in the header, side by side (instead of the status)
    heroFigures: (state, { settings }) => [[t('Points'), state.points], [t('Average'), state.darts ? (state.points / state.darts * 3).toFixed(1) : '–'], [t('Darts'), `${state.darts} / ${settings.darts}`]],
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
    // every dart at T20 and none at a double: higher than the average of X01 legs, which the darts
    // at the finish pull down (a 50 average throws about 60 here, 75 about 88, 90 about 104; the
    // X01 bot works the same way)
    level: { by: t('the 3-dart average'), of: (result) => result.score, bands: [38, 50, 60, 71, 88, 104], format: (value) => Number(value).toFixed(1) },
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
    heroTarget: true,
    // the darts and the doubles hit big under the double (instead of the status)
    heroFigures: (state) => [[t('Darts'), state.darts], [t('Doubles hit'), `${state.index} / 21`]],
    // the darts every double took: one is the best, five or more the worst
    doubles: (state) => doubleCells(state, index => state.perDouble[index], darts => (darts <= 1 ? 3 : darts === 2 ? 2 : darts <= 4 ? 1 : 0)),
    doublesLabel: t('Darts per double'),
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
    ],
    // the hit rate on doubles (DOUBLES_BANDS of levels.play.js): a 90 average hits about 39 % of its
    // darts at a double, near the checkout rate of the pros
    level: { by: t('the hit rate on the doubles'), of: (result) => (result.score ? 21 / result.score * 100 : null), bands: DOUBLES_BANDS, format: levelPercent },
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
    // the second visit of a finish: not checked out, it scores nothing
    inVisit: (state) => state.inAttempt % 3,
    // on tiles under what is left and the way out (instead of the status): which of the 40 finishes
    heroFigures: (state) => [[t('Points'), state.points], [t('Finish'), `${state.target - 60} / 40`], [t('Darts'), `${state.inAttempt} / 6`]],
    status: (state) => [[t('Points'), state.points], [t('Finish'), `${state.target} (${state.target - 60} / 40)`], [t('Darts'), `${state.inAttempt} / 6`]],
    result: (state) => ({ score: state.points, done: state.done, darts: state.darts }),
    higherIsBetter: true,
    format: (score) => tn(score, '{{count}} point', '{{count}} points'),
    figures: (result) => [
        [t('Points'), result.score],
        [t('Checked out'), `${result.done} / 40`],
    ],
    // six darts at each of 61 to 100, aimed at the usual way out: about 21 points for a 50 average,
    // 43 for 75 and 56 for 90
    level: { by: t('the points'), of: (result) => result.score, bands: [3, 12, 21, 30, 43, 56] },
};

/**
 * Treble practice: a set number of darts at one treble. Every dart is a
 * treble, a double or a single of the number, or a miss; the share of
 * trebles counts.
 */
export const TREBLES = {
    id: 'trebles',
    title: t('Treble practice'),
    description: t('A set number of darts at one treble, the 20, 19 or 18: how many of them land in the treble?'),
    rules: [
        t('Throw the darts set at the treble chosen, three a visit.'),
        t('Every dart is a treble, a double or a single of the number, or a miss (anything else).'),
        t('The share of trebles counts; the share on the number at all shows beside it.'),
    ],
    input: 'buttons',
    // the four ways a dart at the treble can land, quicker than the board
    buttons: (settings) => [
        { value: `T${settings.number}`, label: t('Treble'), icon: 'pi pi-check' },
        { value: `S${settings.number}`, label: t('Single'), severity: 'secondary' },
        { value: `D${settings.number}`, label: t('Double'), severity: 'secondary' },
        { value: '0', label: t('Miss'), icon: 'pi pi-times', severity: 'secondary' },
    ],
    options: [
        { key: 'number', label: t('Treble'), values: [{ value: 20, label: 'T20' }, { value: 19, label: 'T19' }, { value: 18, label: 'T18' }], default: 20 },
        { key: 'darts', label: t('Darts'), values: [{ value: 30, label: t('30 darts') }, { value: 60, label: t('60 darts') }, { value: 99, label: t('99 darts') }], default: 30 },
    ],
    // each treble on its own, and a share of a few darts swings more than one of many
    boards: ['number', 'darts'],
    init: () => ({ darts: 0, trebles: 0, onNumber: 0, points: 0, inVisit: 0, visitTrebles: 0, bestVisit: 0 }),
    dart: (state, dart, { settings }) => {
        state.darts += 1;
        state.inVisit += 1;
        if (dart.number === settings.number) {
            state.onNumber += 1;
            state.points += dart.points;
            if (dart.ring === 'T') {
                state.trebles += 1;
                state.visitTrebles += 1;
            }
        }
        if (state.inVisit === 3) {
            state.bestVisit = Math.max(state.bestVisit, state.visitTrebles);
            state.inVisit = 0;
            state.visitTrebles = 0;
        }
        return state;
    },
    done: (state, { settings }) => state.darts >= settings.darts,
    target: (state, { settings }) => `T${settings.number}`,
    hero: (state, { settings }) => `T${settings.number}`,
    heroTarget: true,
    // the trebles, their share and the darts big under the treble (instead of the status)
    heroFigures: (state, { settings }) => [[t('Trebles'), state.trebles], [t('Treble rate'), percent(state.trebles, state.darts)], [t('Darts'), `${state.darts} / ${settings.darts}`]],
    status: (state, { settings }) => [[t('Trebles'), state.trebles], [t('Treble rate'), percent(state.trebles, state.darts)], [t('Darts'), `${state.darts} / ${settings.darts}`]],
    result: (state, { settings } = {}) => ({ score: Math.round(state.trebles / state.darts * 100), trebles: state.trebles, onNumber: state.onNumber, points: state.points, darts: state.darts, bestVisit: state.bestVisit, number: settings?.number ?? 20 }),
    higherIsBetter: true,
    format: (score) => `${score} %`,
    figures: (result) => [
        [t('Treble rate'), `${result.score} %`],
        [t('Trebles'), `${result.trebles} / ${result.darts}`],
        [t('On the number'), percent(result.onNumber, result.darts)],
        // only the darts on the number count (a treble 3 ×, a double 2 ×): out of a treble with every dart
        [t('Points on the {{number}}', { number: result.number ?? 20 }), `${result.points} / ${result.darts * (result.number ?? 20) * 3}`],
    ],
    // the hit rate on trebles (TREBLES_BANDS of levels.play.js): about 13 % of the darts for a 50
    // average, 27 % for 75, 38 % for 90; the 20, 19 and 18 alike
    level: { by: t('the treble rate'), of: (result) => result.score, bands: TREBLES_BANDS, format: levelPercent },
};

/**
 * Bull practice: a set number of darts at the bull. The bullseye (50) and
 * the outer bull (25) are hits; the share of hits counts.
 */
export const BULLS = {
    id: 'bulls',
    title: t('Bull practice'),
    description: t('A set number of darts at the bull: how many hit the bullseye or the outer bull?'),
    rules: [
        t('Throw the darts set at the bull, three a visit.'),
        t('The bullseye (50) and the outer bull (25) are hits, anything else a miss.'),
        t('The share of hits counts; the bullseyes and the points show beside it.'),
    ],
    input: 'buttons',
    buttons: () => [
        { value: 'D25', label: t('Bullseye'), icon: 'pi pi-check' },
        { value: 'S25', label: '25', severity: 'secondary' },
        { value: '0', label: t('Miss'), icon: 'pi pi-times', severity: 'secondary' },
    ],
    options: [{ key: 'darts', label: t('Darts'), values: [{ value: 30, label: t('30 darts') }, { value: 60, label: t('60 darts') }, { value: 99, label: t('99 darts') }], default: 30 }],
    // a share of a few darts swings more than one of many
    boards: ['darts'],
    init: () => ({ darts: 0, bullseyes: 0, outers: 0 }),
    dart: (state, dart) => {
        state.darts += 1;
        if (dart.number === 25) {
            if (dart.ring === 'D') state.bullseyes += 1;
            else state.outers += 1;
        }
        return state;
    },
    done: (state, { settings }) => state.darts >= settings.darts,
    target: () => t('Bull'),
    hero: () => t('Bull'),
    heroTarget: true,
    heroFigures: (state, { settings }) => [[t('Bullseyes'), state.bullseyes], [t('Outer bulls'), state.outers], [t('Darts'), `${state.darts} / ${settings.darts}`]],
    status: (state, { settings }) => [[t('Bullseyes'), state.bullseyes], [t('Outer bulls'), state.outers], [t('Darts'), `${state.darts} / ${settings.darts}`]],
    result: (state) => ({ score: Math.round((state.bullseyes + state.outers) / state.darts * 100), bullseyes: state.bullseyes, outers: state.outers, points: state.bullseyes * 50 + state.outers * 25, darts: state.darts }),
    higherIsBetter: true,
    format: (score) => `${score} %`,
    figures: (result) => [
        [t('Hit rate'), `${result.score} %`],
        [t('Bullseyes'), result.bullseyes],
        [t('Outer bulls'), result.outers],
        [t('Points'), result.points],
    ],
    // the outer bull or the bullseye: a round target as wide as a treble is long, so it takes more
    // darts than one would think: about 37 % for a 50 average, 70 % for 75, 85 % for 90 (the
    // bullseye alone about a third of that at the top, as the pros' checkouts on it)
    level: { by: t('the hit rate on the bull'), of: (result) => result.score, bands: [10, 25, 37, 50, 70, 85], format: levelPercent },
};

// the rungs of the checkout ladder
const LADDER_BOTTOM = 61;
const LADDER_TOP = 100;

/**
 * Checkout ladder: the finishes from 61 to 100, one visit of three darts
 * each. Checked out: one rung up (100 stays 100); not: one down (not below
 * 61). The highest finish checked out counts. 20 attempts reach 80 at most,
 * 40 reach 100 only without a miss, 60 with up to ten.
 */
export const LADDER = {
    id: 'ladder',
    title: t('Checkout ladder'),
    description: t('Climb the finishes from 61 to 100, one visit each: checked out, one rung up; missed, one down. How high do you climb?'),
    rules: [
        t('Start on 61 and check it out with a double in one visit of three darts, as in X01 (a bust ends the visit).'),
        t('Checked out: the next finish is one higher, up to 100. Not checked out: one lower, never below 61.'),
        t('After the attempts set the highest finish checked out counts.'),
    ],
    input: 'board',
    options: [{ key: 'attempts', label: t('Attempts'), values: [{ value: 20, label: t('20 attempts') }, { value: 40, label: t('40 attempts') }, { value: 60, label: t('60 attempts') }], default: 20 }],
    // the attempts set how high one can climb
    boards: ['attempts'],
    init: () => ({ target: LADDER_BOTTOM, left: LADDER_BOTTOM, inAttempt: 0, attempt: 0, done: 0, best: 0, darts: 0 }),
    dart: (state, dart) => {
        state.darts += 1;
        state.inAttempt += 1;
        const after = afterDart(state.left, dart);
        let finished = null;
        if (after.out) finished = true;
        else if (after.bust || state.inAttempt >= 3) finished = false;
        else state.left = after.left;
        if (finished !== null) {
            if (finished) {
                state.done += 1;
                state.best = Math.max(state.best, state.target);
                state.target = Math.min(LADDER_TOP, state.target + 1);
            } else {
                state.target = Math.max(LADDER_BOTTOM, state.target - 1);
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
    checkout: (state) => wayOut(state, 3),
    inVisit: (state) => state.inAttempt,
    // on tiles under what is left and the way out: the highest so far, the attempt and the dart
    heroFigures: (state, { settings }) => [[t('Highest'), state.best || '–'], [t('Attempt'), `${state.attempt + 1} / ${settings.attempts}`], [t('Dart'), `${state.inAttempt + 1} / 3`]],
    status: (state, { settings }) => [[t('Highest'), state.best || '–'], [t('Attempt'), `${state.attempt + 1} / ${settings.attempts}`], [t('Dart'), `${state.inAttempt + 1} / 3`]],
    result: (state) => ({ score: state.best, done: state.done, attempts: state.attempt, darts: state.darts, last: state.target }),
    higherIsBetter: true,
    format: (score) => (score ? String(score) : '–'),
    figures: (result) => [
        [t('Highest checkout'), result.score || '–'],
        [t('Checked out'), `${result.done} / ${result.attempts}`],
        [t('Next finish'), result.last],
    ],
    // the share of the attempts checked out, one visit a finish of 61 and up: about 18 % for a 50
    // average, 37 % for 75 and 48 % for 90, however many attempts. Not the highest checkout: the
    // ladder falls back after every miss, so even a 90 average rarely gets far above 61 and the
    // highest says little about the level
    level: {
        by: t('the checkout rate'),
        of: (result) => (result.attempts ? result.done / result.attempts * 100 : null),
        bands: [3, 11, 18, 25, 37, 48],
        format: levelPercent,
    },
};

// the score a leg of Shortest leg starts from
const LEG_START = 501;

/**
 * Shortest leg: legs of 501 with a double out, alone, as in X01 (a bust
 * ends the visit and its points do not count). The fewest darts of a leg
 * count; the darts of every leg show beside them.
 */
export const SHORTEST_LEG = {
    id: 'shortleg',
    title: t('Shortest leg'),
    description: t('Legs of 501 on your own, double out: how few darts do you need? Your best leg counts, the others show beside it.'),
    rules: [
        t('Play the legs set from 501 with a double out, as in X01: a bust ends the visit and its points do not count.'),
        t('Every dart thrown counts for the leg; a nine-darter is perfect.'),
        t('The fewest darts of a leg count; the darts per leg and the average show beside them.'),
    ],
    input: 'board',
    options: [{ key: 'legs', label: t('Legs'), values: [{ value: 3, label: t('3 legs') }, { value: 5, label: t('5 legs') }, { value: 10, label: t('10 legs') }], default: 3 }],
    // the best of ten legs comes easier than the best of three
    boards: ['legs'],
    init: () => ({ left: LEG_START, visitStart: LEG_START, inVisit: 0, legDarts: 0, darts: 0, legs: [] }),
    dart: (state, dart) => {
        state.darts += 1;
        state.legDarts += 1;
        state.inVisit += 1;
        const after = afterDart(state.left, dart);
        if (after.out) {
            state.legs.push(state.legDarts);
            state.left = LEG_START;
            state.visitStart = LEG_START;
            state.legDarts = 0;
            state.inVisit = 0;
        } else if (after.bust) {
            state.left = state.visitStart;
            state.inVisit = 0;
        } else {
            state.left = after.left;
            if (state.inVisit === 3) {
                state.inVisit = 0;
                state.visitStart = state.left;
            }
        }
        return state;
    },
    done: (state, { settings }) => state.legs.length >= settings.legs,
    // out of a finish's reach: what is left to score
    target: (state) => (state.left > 170 ? t('{{left}} left', { left: state.left }) : t('Check out {{left}}', { left: state.left })),
    hero: (state) => state.left,
    // the ways out once a finish is in reach
    checkout: (state) => (state.left <= 170 ? { left: state.left, dartsLeft: 3 - state.inVisit } : null),
    inVisit: (state) => state.inVisit,
    heroFigures: (state, { settings }) => [[t('Leg'), `${Math.min(state.legs.length + 1, settings.legs)} / ${settings.legs}`], [t('Darts'), state.legDarts], [t('Best leg'), state.legs.length ? Math.min(...state.legs) : '–']],
    status: (state, { settings }) => [[t('Leg'), `${Math.min(state.legs.length + 1, settings.legs)} / ${settings.legs}`], [t('Darts'), state.legDarts], [t('Best leg'), state.legs.length ? Math.min(...state.legs) : '–']],
    result: (state) => ({
        score: Math.min(...state.legs),
        legs: state.legs,
        darts: state.darts,
        // the points of every leg over all the darts, as the average of X01
        average: Math.round(LEG_START * state.legs.length / state.darts * 3 * 10) / 10,
    }),
    higherIsBetter: false,
    format: (score) => tn(score, '{{count}} dart', '{{count}} darts'),
    figures: (result) => [
        [t('Best leg'), result.score],
        [t('Darts per leg'), (result.darts / result.legs.length).toFixed(1)],
        [t('Average'), Number(result.average).toFixed(1)],
        [t('Legs'), result.legs.join(' · ')],
    ],
    // the best leg of the simulated thrower, by the legs played: in three legs about 24 darts for a 50
    // average, 17 for 75, 14 for 90 (as the developer had set it: 24, 17 and 13 for 50, 75 and 95)
    level: { by: t('the darts in the best leg'), of: (result) => result.score, bands: (result, settings) => SHORTEST_LEG_BANDS[settings?.legs] ?? SHORTEST_LEG_BANDS[3], lowerIsBetter: true },
};

export const TRAININGS = [BOBS_27, CHECKOUT_121, RANDOM_CHECKOUTS, SCORING, DOUBLES_AROUND, CATCH_40, TREBLES, BULLS, LADDER, SHORTEST_LEG];
export const trainingOf = (id) => TRAININGS.find(training => training.id === id) ?? null;

/**
 * Why the settings of a training cannot be played, or null: every option one
 * of its values (a missing one is the default), nothing the training does not
 * know, and what it fixes at the start as it would (Random checkouts: a finish
 * for every attempt). The API refuses a training with such settings.
 */
export const settingsProblem = (definition, settings) => {
    if (settings === undefined || settings === null) return settingsProblem(definition, {});
    if (typeof settings !== 'object' || Array.isArray(settings)) return 'settings must be an object.';
    const options = definition.options ?? [];
    const prepared = definition.prepared ?? {};
    for (const [key, value] of Object.entries(settings)) {
        const option = options.find(entry => entry.key === key);
        if (option && !option.values.some(entry => entry.value === value)) return `${key} must be one of: ${option.values.map(entry => entry.value).join(', ')}.`;
        if (!option && !Object.hasOwn(prepared, key)) return `${key} is not a setting of this training.`;
    }
    const full = settingsOf(definition, settings);
    const wrong = Object.entries(prepared).find(([key, valid]) => !valid(full[key], full));
    return wrong ? `${wrong[0]} is not what this training draws at its start.` : null;
};

/**
 * The settings that split a training's scoreboard, with their values: a score
 * is only compared (the scoreboard, records and "new best", the trend, a
 * weekly goal) with those of the same, as 140 in 121 Checkout cannot be
 * reached in 10 attempts. Each definition lists them in "boards"; a setting
 * an older training does not have is the default. { attempts: 20, darts: 9 },
 * {} for a training with one board.
 */
export const boardOf = (definition, settings = {}) => Object.fromEntries((definition?.boards ?? []).map(key => {
    const option = definition.options.find(entry => entry.key === key);
    const value = settings?.[key];
    if (value === undefined || value === null) return [key, option.default];
    // a value of the options as the option has it (an older one kept as text too); one it does not know stays apart
    return [key, option.values.find(entry => String(entry.value) === String(value))?.value ?? value];
}));

// a board as one key: "attempts:20|darts:9", '' for a training with one board
export const boardKeyOf = (definition, settings) => Object.entries(boardOf(definition, settings)).map(([key, value]) => `${key}:${value}`).join('|');

// a board in words, one per setting: ['20 attempts', '9 darts'] ([] for one board)
export const boardLabels = (definition, settings) => Object.entries(boardOf(definition, settings))
    .map(([key, value]) => definition.options.find(entry => entry.key === key).values.find(entry => entry.value === value)?.label ?? String(value));

// the board of the default settings: the one to show when nothing else says which
export const defaultBoardKey = (definition) => boardKeyOf(definition, {});

/**
 * The places of attempts best first: the same score shares a place (two at 130
 * are both 1st, the next is 3rd), unless the training's own tiebreak tells
 * them apart (Bob's 27: further on the board). better(a, b): the order of the
 * list, 0 for the same.
 */
export const placesOf = (list, better) => {
    const places = [];
    list.forEach((entry, index) => {
        places.push(index > 0 && better(entry, list[index - 1]) === 0 ? places[index - 1] : index + 1);
    });
    return places;
};
