/**
 * The level a game or a training was played at, as a rough estimate from one
 * figure of it: pub, amateur, pro or world class. Not the level of a player
 * (that is the LevelBadge, from many games): one game or training alone.
 *
 * A level definition: { by: what it is judged by (shown), of: (...) => the
 * figure, or null when there is not enough to judge, bands: [amateurFrom,
 * proFrom, worldClassFrom] or a function of the same arguments as "of",
 * lowerIsBetter, format?: the figure as shown }. The newer games and the
 * trainings have theirs next to their definition (games.js, trainings.js),
 * the older games here.
 */
import { t } from '../utils/i18n.js';

export const LEVELS = ['pub', 'amateur', 'pro', 'worldClass'];

/**
 * The level of a figure by its bands, [amateurFrom, proFrom, worldClassFrom]:
 * reaching a band (at least it, or at most it when lower is better) is that
 * level. Null without a figure or bands.
 */
export const playLevel = (value, { bands, lowerIsBetter = false } = {}) => {
    if (value == null || value === '' || !Array.isArray(bands) || bands.length !== 3) return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const reached = bands.filter(band => (lowerIsBetter ? number <= band : number >= band)).length;
    return LEVELS[reached];
};

/**
 * A level definition applied: { level, by, value (as shown) }, or null when
 * there is nothing to judge. "args" go to its "of" and "bands".
 */
export const judgeLevel = (definition, ...args) => {
    if (!definition) return null;
    const value = definition.of(...args);
    if (value == null) return null;
    const bands = typeof definition.bands === 'function' ? definition.bands(...args) : definition.bands;
    const level = playLevel(value, { bands, lowerIsBetter: definition.lowerIsBetter });
    if (!level) return null;
    return { level, by: definition.by, value: definition.format ? definition.format(value) : String(value) };
};

// fewer darts than this say too little about a game
export const MIN_DARTS = 9;

const oneDecimal = (value) => Number(value).toFixed(1);
const twoDecimals = (value) => Number(value).toFixed(2);
const percent = (value) => `${Math.round(value)} %`;

// the bands of the 3-dart average, fixed with the developer: pub under 50,
// amateur 50 to 75, pro 75 to 95, world class 95 and more
export const AVERAGE_BANDS = [50, 75, 95];
// marks per round, fixed with the developer: the usual rule of thumb is about
// an eighth of the points per dart (avg 50 ≈ 2.0, 75 ≈ 3.0, 95 ≈ 4.0)
export const MARKS_BANDS = [2, 3, 4];
// hit rate on doubles, fixed with the developer (Doubles around the board):
// pros check out 35–45 % of their darts at a double
export const DOUBLES_BANDS = [10, 25, 40];
// hit rate on trebles: about 9 % of the darts at T20 for a 50 average, 22 % for
// 75 and 35 % for 95 (the average is mostly trebles and singles of the 20)
export const TREBLES_BANDS = [8, 20, 33];

/**
 * X01, from the figures of a player (x01.game.summary): the 3-dart average,
 * from nine darts on.
 */
export const X01_LEVEL = {
    by: t('the 3-dart average'),
    of: (figures) => (figures?.dartsThrown >= MIN_DARTS ? figures.average : null),
    bands: AVERAGE_BANDS,
    format: oneDecimal,
};

/**
 * Cricket, from the figures of a player (cricket.game.summary): the marks per
 * round, from nine darts on.
 */
export const CRICKET_LEVEL = {
    by: t('the marks per round'),
    of: (figures) => (figures?.dartsThrown >= MIN_DARTS ? figures.marksPerRound : null),
    bands: MARKS_BANDS,
    format: twoDecimals,
};

/**
 * Elimination, from the figures of a player (elimination.game.summary): the
 * points per visit, as the 3-dart average of X01, from nine darts on.
 */
export const ELIMINATION_LEVEL = {
    by: t('the average per visit'),
    // a visit typed as one score has no darts: three visits then
    of: (figures) => (figures?.dartsThrown >= MIN_DARTS || figures?.visits >= 3 ? figures.average : null),
    bands: AVERAGE_BANDS,
    format: oneDecimal,
};

// Around the Clock by mode, the hit rate on the number of the moment: a dart
// at a single (the big part of the number) lands far more often than one at a
// double or a treble
const CLOCK_BANDS = {
    // any ring of the number: about 55 % of the darts land on it for a 50
    // average, 70 % for 75, 85 % for 95
    All: [50, 70, 85],
    // only the single counts (a double or treble of it is a miss): a little less
    Single: [45, 65, 80],
    // only doubles: as the doubles around the board
    Double: DOUBLES_BANDS,
    // only trebles: as treble practice
    Triple: TREBLES_BANDS,
};

/**
 * Around the Clock, game or training, from { darts, hitRate } of a player and
 * the mode: the hit rate, from nine darts on.
 */
export const CLOCK_LEVEL = {
    by: t('the hit rate on the numbers'),
    of: (result) => (result?.darts >= MIN_DARTS ? result.hitRate : null),
    bands: (result, mode) => CLOCK_BANDS[mode] ?? null,
    format: percent,
};
