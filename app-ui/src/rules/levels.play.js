/**
 * The level a game or a training was played at, as a rough estimate from one
 * figure of it, on the steps of the average levels (utils/average.levels.js
 * gives them their names, icons and colours): beginner, hobby, amateur,
 * semi-pro, pro, world class and elite. Not the level of a player (that is
 * the LevelBadge, from many games): one game or training alone.
 *
 * A level definition: { by: what it is judged by (shown), of: (...) => the
 * figure, or null when there is not enough to judge, bands: the six figures
 * where hobby, amateur, semi-pro, pro, world class and elite start, or a
 * function of the same arguments as "of" giving them, lowerIsBetter,
 * format?: the figure as shown }. A step means the same in every game: the
 * bands are what a player of a 25, 40, 50, 60, 75 and 90 average throws in
 * it (worked out with a simulated thrower). The newer games and the
 * trainings have theirs next to their definition (games.js, trainings.js),
 * the older games here.
 */
import { t } from '../utils/i18n.js';

/**
 * The steps, lowest first, with the 3-dart average of X01 each one starts
 * from: the one scale of the app, the average levels of the statistics too.
 */
export const LEVEL_STEPS = [
    { key: 'beginner', average: 0 },
    { key: 'hobby', average: 25 },
    { key: 'amateur', average: 40 },
    { key: 'semiPro', average: 50 },
    { key: 'pro', average: 60 },
    { key: 'worldClass', average: 75 },
    { key: 'elite', average: 90 },
];

export const LEVELS = LEVEL_STEPS.map(step => step.key);

/**
 * The level of a figure by its six bands (where hobby to elite start):
 * reaching a band (at least it, or at most it when lower is better) is that
 * level. Null without a figure or bands.
 */
export const playLevel = (value, { bands, lowerIsBetter = false } = {}) => {
    if (value == null || value === '' || !Array.isArray(bands) || bands.length !== LEVELS.length - 1) return null;
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

// How the bands were found: a simulated thrower whose darts scatter round the
// point aimed at (a normal spread on the board, one dart in seven or so going
// wider), the spread set so that whole legs of 501, aimed as the X01 bot aims
// (x01.bot.js), come out at an average of 25, 40, 50, 60, 75 and 90; then each
// game or training played with it many times, by its own rules where it has
// them. The bands are what such a player typically scores, rounded.

// the 3-dart average itself: where the steps start
export const AVERAGE_BANDS = LEVEL_STEPS.slice(1).map(step => step.average);
// marks per round in Cricket, aiming at the trebles of 20 to 15 and the bull until
// each is closed, every mark counting (25 to 90 average: 1.5 to 5.0)
export const MARKS_BANDS = [1.5, 2.1, 2.7, 3.3, 4.1, 5];
// hit rate on doubles (Doubles around the board, Killer, Around the Clock on
// doubles): the share of darts at a double that land in it (a 90 average about
// 39 %, near the checkout rate of the pros)
export const DOUBLES_BANDS = [5, 11, 16, 22, 30, 39];
// hit rate on trebles (Treble practice, Around the Clock on trebles): about 13 %
// of the darts at T20 for a 50 average, 27 % for 75 and 38 % for 90; the same
// with the bot's own model of the average
export const TREBLES_BANDS = [3, 8, 13, 18, 27, 38];

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

// Around the Clock by mode, the hit rate on the number of the moment, 1 to 20
// and the bull: a dart at a single (the big part of the number) lands far more
// often than one at a double or a treble
const CLOCK_BANDS = {
    // any ring of the number, aiming at its outer single: about 72 % of the darts
    // land on it for a 50 average, 90 % for 75, 95 % for 90
    All: [33, 60, 72, 81, 90, 95],
    // only the single counts (a double or treble of it is a miss): a little less
    Single: [29, 54, 66, 78, 87, 91],
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
