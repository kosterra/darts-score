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

const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;
// '' stands for a dart not thrown because the leg was over; '0' is a miss
const thrown = (darts) => (Array.isArray(darts) ? darts : []).filter(dart => dart !== '' && dart != null);
const sumOf = (values) => values.reduce((total, value) => total + value, 0);
const MULTIPLIER = { S: 1, D: 2, T: 3 };
// a dart on a number of Cricket (15 to 20 and the bull) as its marks, else 0
const cricketMarks = (dart) => {
    const match = /^([SDT])(\d{1,2})$/i.exec(String(dart ?? '').trim());
    if (!match || ![15, 16, 17, 18, 19, 20, 25].includes(Number(match[2]))) return 0;
    return MULTIPLIER[match[1].toUpperCase()];
};
// "T20" → 60, "D25" → 50, a miss 0
const dartPoints = (dart) => {
    const match = /^([SDT])(\d{1,2})$/i.exec(String(dart ?? '').trim());
    return match ? Number(match[2]) * MULTIPLIER[match[1].toUpperCase()] : 0;
};

/**
 * The figures a level is judged by, from a game as the app reads it (what is
 * stored, with what follows from its visits: see stored.js), for one player:
 * the same as the statistics of the game work out (x01.game.summary,
 * cricket.game.summary, elimination.game.summary, clockResults).
 */
export const LEVEL_FIGURES = {
    x01: (game, playerId) => {
        const model = game?.playerModels?.[playerId] ?? {};
        const overall = model.averages?.game?.overall;
        const darts = model.totalThrow?.game?.darts
            ?? sumOf((game?.visits ?? []).filter(visit => visit.player === playerId).map(visit => thrown(visit.darts).length));
        return { average: overall != null ? round1(overall) : null, dartsThrown: darts };
    },
    cricket: (game, playerId) => {
        const model = game?.playerModels?.[playerId] ?? {};
        const visits = (game?.allThrows ?? []).filter(visit => visit?.playerId === playerId);
        const darts = visits.flatMap(visit => thrown(visit.darts));
        const rounds = Number(model.totalThrow?.game?.rounds ?? visits.length);
        return {
            marksPerRound: rounds ? round2(sumOf(darts.map(cricketMarks)) / rounds) : null,
            dartsThrown: Number(model.totalThrow?.game?.darts ?? darts.length),
        };
    },
    elimination: (game, playerId) => {
        const visits = (game?.allThrows ?? []).filter(visit => visit?.playerId === playerId);
        // a bust scores nothing; a visit typed as one score has its score and no darts
        const scores = visits.map(visit => (visit.bust ? 0 : visit.roundScore ?? sumOf(thrown(visit.darts).map(dartPoints))));
        return {
            average: scores.length ? round1(sumOf(scores) / scores.length) : null,
            dartsThrown: sumOf(visits.map(visit => thrown(visit.darts).length)),
            visits: visits.length,
        };
    },
    clock: (game, playerId) => {
        const model = game?.playerModels?.[playerId] ?? {};
        const darts = model.darts ?? 0;
        return { darts, hitRate: darts ? Math.round((model.hits ?? 0) / darts * 100) : 0 };
    },
};
LEVEL_FIGURES.x01training = LEVEL_FIGURES.x01;

const STORED_LEVELS = { x01: X01_LEVEL, x01training: X01_LEVEL, cricket: CRICKET_LEVEL, elimination: ELIMINATION_LEVEL, clock: CLOCK_LEVEL };

/**
 * The level one player played a game of X01 (also against the bot), Cricket,
 * Elimination or Around the Clock at, from the game as the app reads it:
 * { level, by, value } of judgeLevel, or null.
 */
export const gameLevelOf = (type, game, playerId) => {
    const definition = STORED_LEVELS[type];
    if (!definition) return null;
    return judgeLevel(definition, LEVEL_FIGURES[type](game, playerId), game?.mode);
};

/**
 * Around the Clock as a training with the fewest darts: every one of the 21
 * targets is hit once, so the hit rate follows from the darts. Null for a
 * training against the clock (no darts counted).
 */
export const atcTrainingLevelOf = (entry) => {
    const darts = Number(entry?.darts);
    if (entry?.scoring !== 'Darts' || !darts) return null;
    return judgeLevel(CLOCK_LEVEL, { darts, hitRate: Math.round(21 / darts * 100) }, entry.mode);
};
