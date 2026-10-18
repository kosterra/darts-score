import { outModeOf, startingScoreOf } from './x01.rules.js';
import { cricketMarks } from './kpi.data.js';

/**
 * Badges players collect. Each group counts one thing (a "metric") and has
 * tiers that are earned when the metric reaches the tier's target. In groups
 * marked "lower" a smaller number is better (fewest darts): a tier is earned
 * once the metric is at or below its target.
 *
 * Badges are worked out by replaying a player's finished games and trainings
 * in the order they happened, so every badge knows the game it was earned in.
 */

const HIGH_FINISH = 100;
const SHANGHAI = ['S20', 'T20', 'D20'];
const BED_AND_BREAKFAST = ['S20', 'S5', 'S1'];
const NINE_DARTS = 9;
const NINE_DARTER_SCORE = 501;
const COMEBACK_DEFICIT = 2;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// 1970-01-05 was a Monday, so weeks counted from it run Monday to Sunday
const FIRST_MONDAY_MS = Date.UTC(1970, 0, 5);
const BIG_FISH = 170;
// An average only counts once a game lasted a few rounds
const MIN_ROUNDS_FOR_AVERAGE = 5;
// A whitewash needs a real match, not a single leg
const MIN_LEGS_FOR_WHITEWASH = 2;
const TON = 100;
const TON_FORTY = 140;
const BAG_OF_NUTS = 45;
const SHORT_LEG_SCORE = 501;
// marks per round only count once a Cricket game lasted a few rounds
const MIN_ROUNDS_FOR_MARKS = 5;
const CRICKET_TREBLES = new Set([15, 16, 17, 18, 19, 20]);
// the Around the Clock modes there are; finishing each once is the full set
const TRAINING_MODES = ['Single', 'Double', 'Triple', 'All'];
const DAY_MS = 24 * 60 * 60 * 1000;
const BUSTS_IN_A_LEG = 3;
const DARTS_AT_DOUBLE = 10;
const LOSING_STREAK = 5;
const WINS_TO_WARM_UP = 2;
const BIG_CHECKOUT = 60;
const MIN_PLAYERS_FOR_LAST = 3;
const formatCount = (n) => new Intl.NumberFormat('en').format(n);

// Series are shown in these categories, in this order
export const BADGE_CATEGORIES = [
    { category: 'milestones', title: 'Milestones' },
    { category: 'winning', title: 'Winning' },
    { category: 'scoring', title: 'Scoring' },
    { category: 'finishing', title: 'Finishing' },
    { category: 'training', title: 'Training' },
];

export const BADGE_GROUPS = [
    {
        group: 'games', category: 'milestones', title: 'Games played', metric: 'games',
        describe: (n) => n === 1 ? 'Finish your first game' : `Finish ${n} games`,
        tiers: [[1, 'First Throw'], [10, 'Warming Up'], [50, 'Regular'], [100, 'Centurion'], [500, 'Oche Veteran'], [1000, 'Living Legend']],
    },
    {
        group: 'wins', category: 'winning', title: 'Wins', metric: 'wins',
        describe: (n) => n === 1 ? 'Win your first game against an opponent' : `Win ${n} games against opponents`,
        tiers: [[1, 'First Win'], [10, 'Winner'], [50, 'Serial Winner'], [100, 'Champion'], [500, 'Dominator']],
    },
    {
        group: 'streak', category: 'winning', title: 'Winning streaks', metric: 'bestStreak',
        describe: (n) => `Win ${n} games in a row`,
        tiers: [[3, 'Hattrick'], [5, 'On Fire'], [10, 'Unstoppable']],
    },
    {
        group: 'max180', category: 'scoring', title: '180s', metric: 'num180s',
        describe: (n) => n === 1 ? 'Throw your first 180' : `Throw ${n} 180s`,
        tiers: [[1, 'One Hundred and Eighty!'], [10, 'Maximum Collector'], [50, 'Treble Twenty Regular'], [100, 'Maximum Machine']],
    },
    {
        group: 'highFinish', category: 'finishing', title: 'High finishes', metric: 'highFinishes',
        describe: (n) => n === 1 ? `Check out ${HIGH_FINISH} or more` : `Check out ${HIGH_FINISH} or more ${n} times`,
        tiers: [[1, 'Ton-Plus Finish'], [5, 'Finisher'], [10, 'Clinical'], [50, 'Checkout King']],
    },
    {
        group: 'bullFinish', category: 'finishing', title: 'Bull finishes', metric: 'bullFinishes',
        describe: (n) => n === 1 ? 'Finish a leg on the bull' : `Finish ${n} legs on the bull`,
        tiers: [[1, 'Bullseye Finish'], [10, 'Bull Rider']],
    },
    {
        group: 'bigFish', category: 'finishing', title: 'The big fish', metric: 'bigFishes',
        describe: () => `Check out ${BIG_FISH}, the highest finish there is`,
        tiers: [[1, 'The Big Fish']],
    },
    {
        group: 'shanghai', category: 'finishing', title: 'Shanghai finish', metric: 'shanghaiFinishes',
        describe: () => 'Check out 120 with single, treble and double 20',
        tiers: [[1, 'Shanghai']],
    },
    {
        group: 'nineDarter', category: 'finishing', title: 'Nine-darter', metric: 'nineDarters',
        describe: () => `Win a ${NINE_DARTER_SCORE} leg with nine darts, the perfect leg`,
        tiers: [[1, 'Nine-Darter']],
    },
    {
        group: 'whitewash', category: 'winning', title: 'Whitewashes', metric: 'whitewashes',
        describe: (n) => n === 1 ? 'Win an X01 match without losing a leg' : `Win ${n} X01 matches without losing a leg`,
        tiers: [[1, 'Whitewash'], [5, 'Clean Sweeper'], [10, 'No Mercy']],
    },
    {
        group: 'maxHatTrick', category: 'scoring', title: 'Hattrick of maximums', metric: 'maxHatTricks',
        describe: () => 'Throw three 180s in one game',
        tiers: [[1, 'Hattrick of Maximums']],
    },
    {
        group: 'average', category: 'scoring', title: 'Game average', metric: 'bestAverage',
        describe: (n) => `Finish an X01 game with an average of ${n} or more`,
        tiers: [[60, 'Solid Sixty'], [80, 'Eighty Plus'], [100, 'Ton Average']],
    },
    {
        group: 'comeback', category: 'winning', title: 'Comeback', metric: 'comebacks',
        describe: () => `Win an X01 match after being ${COMEBACK_DEFICIT} legs behind`,
        tiers: [[1, 'Comeback']],
    },
    {
        group: 'cricketWins', category: 'winning', title: 'Cricket', metric: 'winsCricket',
        describe: (n) => n === 1 ? 'Win a Cricket game' : `Win ${n} Cricket games`,
        tiers: [[1, 'Cricket Opener'], [10, 'Cricket Specialist'], [50, 'Cricket Master']],
    },
    {
        group: 'eliminationWins', category: 'winning', title: 'Elimination', metric: 'winsElimination',
        describe: (n) => n === 1 ? 'Win an Elimination game' : `Win ${n} Elimination games`,
        tiers: [[1, 'Eliminator'], [10, 'Hitman'], [50, 'Last One Standing']],
    },
    {
        group: 'clockWins', category: 'winning', title: 'Around the Clock', metric: 'winsClock',
        describe: (n) => n === 1 ? 'Win an Around the Clock game' : `Win ${n} Around the Clock games`,
        tiers: [[1, 'Clockwork'], [10, 'Round the Board'], [50, 'Master of the Clock']],
    },
    {
        group: 'allRounder', category: 'winning', title: 'All-rounder', metric: 'gameTypesWon',
        describe: () => 'Win at least one game in every game type: X01, Cricket and Elimination',
        tiers: [[3, 'All-Rounder']],
    },
    {
        group: 'weekStreak', category: 'milestones', title: 'Weekly streak', metric: 'bestWeekStreak',
        describe: (n) => `Play in ${n} weeks in a row`,
        tiers: [[4, 'Regular Fixture'], [12, 'Season Ticket'], [26, 'Half-Year Hero'], [52, 'Year-Round']],
    },
    {
        group: 'darts', category: 'milestones', title: 'Darts thrown', metric: 'darts',
        describe: (n) => `Throw ${formatCount(n)} darts`,
        tiers: [[1000, 'A Thousand Darts'], [10000, 'Ten Thousand Darts'], [50000, 'Dart Marathon'], [100000, 'Dart Machine']],
    },
    {
        group: 'rivals', category: 'milestones', title: 'Rivals', metric: 'opponents',
        describe: (n) => `Play against ${n} different opponents`,
        tiers: [[5, 'Sociable'], [15, 'Club Favourite'], [30, 'Everyone\'s Rival']],
    },
    {
        group: 'anniversary', category: 'milestones', title: 'Anniversary', metric: 'daysSinceFirst',
        describe: (n) => `Still play or train ${n / 365 === 1 ? 'a year' : `${n / 365} years`} after your first game`,
        label: (n) => n / 365 === 1 ? '1 year' : `${n / 365} years`,
        tiers: [[365, 'One Year at the Oche'], [730, 'Two Years at the Oche'], [1825, 'Five Years at the Oche']],
    },
    {
        group: 'tonPlus', category: 'scoring', title: 'Ton-plus visits', metric: 'tonPlusVisits',
        describe: (n) => `Score ${TON} or more in one visit ${formatCount(n)} times`,
        tiers: [[10, 'Ton Up'], [100, 'Ton Machine'], [500, 'Heavy Scorer']],
    },
    {
        group: 'tonForty', category: 'scoring', title: 'Ton-forty visits', metric: 'tonFortyVisits',
        describe: (n) => n === 1 ? `Score ${TON_FORTY} or more in one visit` : `Score ${TON_FORTY} or more in one visit ${n} times`,
        tiers: [[1, 'Ton-Forty'], [25, 'Big Hitter'], [100, 'Power Scorer']],
    },
    {
        group: 'threeInABed', category: 'scoring', title: 'Three in a bed', metric: 'threeInABeds',
        describe: () => 'Throw all three darts of a visit into the same treble (treble 20 has the 180s)',
        tiers: [[1, 'Three in a Bed']],
    },
    {
        group: 'bagOfNuts', category: 'scoring', title: 'Bag of nuts', metric: 'bagsOfNuts',
        describe: () => `Score ${BAG_OF_NUTS} in one visit, the "bag of nuts" of the darts slang`,
        tiers: [[1, 'Bag of Nuts']],
    },
    {
        group: 'shortLeg', category: 'finishing', title: 'Short legs', metric: 'bestLegDarts', lower: true,
        describe: (n) => `Win a ${SHORT_LEG_SCORE} leg with ${n} darts or fewer`,
        tiers: [[18, '18-Darter'], [15, '15-Darter'], [12, '12-Darter']],
    },
    {
        group: 'doubleTop', category: 'finishing', title: 'Double top', metric: 'doubleTops',
        describe: (n) => `Finish a leg on double 20 ${n} times`,
        tiers: [[10, 'Double Top'], [50, 'Top of the Board'], [100, 'Tops Specialist']],
    },
    {
        group: 'clutch', category: 'winning', title: 'Deciding leg', metric: 'clutchWins',
        describe: () => 'Win an X01 match in the deciding leg',
        tiers: [[1, 'Nerves of Steel']],
    },
    {
        group: 'whiteHorse', category: 'scoring', title: 'White horse', metric: 'whiteHorses',
        describe: () => 'Hit three different trebles from 15 to 20 in one Cricket visit',
        tiers: [[1, 'White Horse']],
    },
    {
        group: 'bullHatTrick', category: 'scoring', title: 'Hat trick of bulls', metric: 'bullHatTricks',
        describe: () => 'Hit the bull with all three darts of a visit',
        tiers: [[1, 'Hat Trick']],
    },
    {
        group: 'marksPerRound', category: 'scoring', title: 'Cricket marks per round', metric: 'bestMarksPerRound',
        describe: (n) => `Finish a Cricket game with ${n} or more marks per round`,
        tiers: [[3, 'Three-Mark Player'], [4, 'Marksman'], [5, 'Cricket Machine']],
    },
    {
        group: 'training', category: 'training', title: 'Around the Clock', metric: 'trainings',
        describe: (n) => n === 1 ? 'Finish an Around the Clock training' : `Finish ${n} Around the Clock trainings`,
        tiers: [[1, 'First Lap'], [10, 'Clock Watcher'], [50, 'Around the World']],
    },
    {
        group: 'records', category: 'training', title: 'Personal records', metric: 'trainingRecords',
        describe: (n) => n === 1 ? 'Beat your own best Around the Clock time' : `Beat your own best Around the Clock time ${n} times`,
        tiers: [[1, 'Personal Best'], [5, 'Record Breaker']],
    },
    {
        group: 'trainingDays', category: 'training', title: 'Training days', metric: 'trainingDays',
        describe: (n) => `Train on ${n} different days`,
        tiers: [[5, 'Training Rookie'], [25, 'Dedicated'], [100, 'Training Champion'], [250, 'Training Legend']],
    },
    {
        group: 'trainingStreak', category: 'training', title: 'Training streak', metric: 'bestTrainingWeekStreak',
        describe: (n) => `Train in ${n} weeks in a row`,
        tiers: [[4, 'Routine'], [12, 'Disciplined'], [26, 'Iron Will']],
    },
    {
        group: 'trainingModes', category: 'training', title: 'Full set', metric: 'trainingModes',
        describe: () => 'Finish an Around the Clock training in every mode: single, double, treble and all',
        tiers: [[TRAINING_MODES.length, 'Full Set']],
    },
    {
        group: 'trainingDarts', category: 'training', title: 'Sharp shooter', metric: 'bestSinglesDarts', lower: true,
        describe: (n) => `Finish an Around the Clock training on singles with ${n} darts or fewer`,
        tiers: [[40, 'Steady Hand'], [30, 'Sharp Shooter'], [25, 'Sniper']],
    },
];

/**
 * The Hall of Shame: what nobody wants to throw. Each one is counted every
 * time it happens, and in every club one player holds it, the one who did it
 * last, until someone else takes it over or they wash it off with the good
 * deed ("wash", a metric that has to grow after the shame). They add no XP.
 */
export const SHAME_BADGES = [
    {
        id: 'bedAndBreakfast', title: 'Bed and Breakfast', metric: 'bedAndBreakfasts', washMetric: 'tonPlusVisits',
        description: 'Score 26 with single 20, single 5 and single 1: aiming at the treble 20 and landing in its neighbours',
        wash: `Score ${TON} or more in a visit`,
    },
    {
        id: 'madhouse', title: 'Madhouse', metric: 'madhouses', washMetric: 'highFinishes',
        description: 'Check out on double 1, after splitting the doubles all the way down',
        wash: `Check out ${HIGH_FINISH} or more`,
    },
    {
        id: 'nothingDoing', title: 'Nothing Doing', metric: 'nothingDoings', washMetric: 'tonFortyVisits',
        description: 'Three darts in a visit and no score',
        wash: `Score ${TON_FORTY} or more in a visit`,
    },
    {
        id: 'bustMaster', title: 'Bust Master', metric: 'bustMasters', washMetric: 'bigCheckouts',
        description: `Bust ${BUSTS_IN_A_LEG} times in one leg`,
        wash: `Check out ${BIG_CHECKOUT} or more`,
    },
    {
        id: 'stuckOnTheDouble', title: 'Stuck on the Double', metric: 'stuckOnDoubles', washMetric: 'firstDartCheckouts',
        description: `Throw ${DARTS_AT_DOUBLE} or more darts at a double in one leg`,
        wash: 'Check out with your first dart at a double in a leg',
    },
    {
        id: 'whitewashed', title: 'Whitewashed', metric: 'whitewashedLosses', washMetric: 'winsX01',
        description: 'Lose an X01 match without winning a single leg',
        wash: 'Win an X01 match',
    },
    {
        id: 'bottledIt', title: 'Bottled It', metric: 'bottledIts', washMetric: 'clutchWins',
        description: `Lose an X01 match after leading by ${COMEBACK_DEFICIT} legs`,
        wash: 'Win an X01 match in the deciding leg',
    },
    {
        id: 'woodenSpoon', title: 'Wooden Spoon', metric: 'woodenSpoons', washMetric: 'bigGameWins',
        description: `Finish last in a game of ${MIN_PLAYERS_FOR_LAST} or more players`,
        wash: `Win a game of ${MIN_PLAYERS_FOR_LAST} or more players`,
    },
    {
        id: 'coldSpell', title: 'Cold Spell', metric: 'coldSpells', washMetric: 'warmUps',
        description: `Lose ${LOSING_STREAK} games in a row`,
        wash: `Win ${WINS_TO_WARM_UP} games in a row`,
    },
];

export const getShameBadge = (id) => SHAME_BADGES.find(badge => badge.id === id);

/**
 * Every single badge, flattened from the groups.
 */
// the target as the app shows it next to a badge's name
const defaultLabel = (lower) => (n) => lower ? `≤ ${n} darts` : formatCount(n);

export const BADGES = BADGE_GROUPS.flatMap(({ group, category, title, metric, lower = false, describe, label = defaultLabel(lower), tiers }) =>
    tiers.map(([target, name], index) => ({
        id: `${group}-${target}`,
        group,
        groupTitle: title,
        category,
        metric,
        lower,
        title: name,
        description: describe(target),
        targetLabel: label(target),
        target,
        tier: index + 1,
        tiers: tiers.length,
    })));

export const getBadge = (id) => BADGES.find(badge => badge.id === id);

/**
 * How many of the stored badges still exist (Madhouse and Bed and Breakfast
 * moved to the Hall of Shame and no longer count).
 */
export const countBadges = (entries = []) => entries.filter(entry => getBadge(entry.badge)).length;

/**
 * Whether a metric reached a badge: at least the target, or for "lower"
 * badges a value at or below it (0 means nothing yet).
 */
export const reached = (badge, value = 0) => badge.lower ? value > 0 && value <= badge.target : value >= badge.target;

const newMetrics = () => ({
    games: 0, wins: 0, streak: 0, bestStreak: 0, num180s: 0, highFinishes: 0, bullFinishes: 0, bigFishes: 0,
    whitewashes: 0, shanghaiFinishes: 0, nineDarters: 0, madhouses: 0, bedAndBreakfasts: 0, maxHatTricks: 0, comebacks: 0,
    weekStreak: 0, bestWeekStreak: 0, lastWeek: null, bestAverage: 0, winsX01: 0, winsCricket: 0, winsElimination: 0, winsClock: 0, gameTypesWon: 0,
    darts: 0, trainings: 0, trainingRecords: 0, bestTrainingTimes: {},
    opponents: 0, opponentIds: new Set(), firstAt: null, daysSinceFirst: 0,
    tonPlusVisits: 0, tonFortyVisits: 0, threeInABeds: 0, bagsOfNuts: 0, bestLegDarts: 0, doubleTops: 0, clutchWins: 0,
    whiteHorses: 0, bullHatTricks: 0, bestMarksPerRound: 0,
    trainingDays: 0, lastTrainingDay: null, trainingWeekStreak: 0, bestTrainingWeekStreak: 0, lastTrainingWeek: null,
    trainingModes: 0, trainingModesDone: new Set(), bestSinglesDarts: 0,
    // the Hall of Shame and the good deeds that wash it off
    nothingDoings: 0, bustMasters: 0, stuckOnDoubles: 0, whitewashedLosses: 0, bottledIts: 0, woodenSpoons: 0, coldSpells: 0,
    lossStreak: 0, bigCheckouts: 0, firstDartCheckouts: 0, bigGameWins: 0, warmUps: 0,
});

const number = (key) => Number(String(key).replace(/\D/g, '')) || 0;

/**
 * The legs of an X01 game in the order they were played, each a list of
 * visits { playerId, darts, scoreLeft }, from allSetsThrows:
 * { 'set-1': { 'leg-1': [visit, ...] } }.
 */
export const legsInOrder = (game) =>
    Object.entries(game.allSetsThrows ?? {})
        .sort(([a], [b]) => number(a) - number(b))
        .flatMap(([, set]) => Object.entries(set ?? {}).sort(([a], [b]) => number(a) - number(b)).map(([, leg]) => leg))
        .filter(Array.isArray);

export const thrownDarts = (darts) => (Array.isArray(darts) ? darts : []).filter(dart => dart !== '' && dart != null);

const sameDarts = (darts, wanted) => {
    const thrown = thrownDarts(darts).filter(dart => dart !== '0').map(dart => dart.toUpperCase()).sort();
    return thrown.length === wanted.length && thrown.join() === [...wanted].sort().join();
};

const upperDarts = (darts) => thrownDarts(darts).map(dart => String(dart).toUpperCase());

const MULTIPLIERS = { S: 1, D: 2, T: 3 };
// 'T20' → 60, 'D25' → 50, '0' → 0
const dartValue = (dart) => {
    const text = String(dart).toUpperCase();
    return (MULTIPLIERS[text[0]] ?? 0) * (Number(text.slice(1)) || 0);
};
const visitScore = (visit) => Number.isFinite(visit.roundScore) ? visit.roundScore : upperDarts(visit.darts).reduce((sum, dart) => sum + dartValue(dart), 0);
// what can be checked out with one dart at a double (or the bull)
const onADouble = (left) => left === 50 || (left >= 2 && left <= 40 && left % 2 === 0);

/**
 * How many darts of a visit were thrown at a double: those thrown while what
 * was left could be checked out with one dart.
 */
const dartsAtDouble = (darts, before) => {
    let left = before;
    let count = 0;
    for (const dart of upperDarts(darts)) {
        if (onADouble(left)) count += 1;
        left -= dartValue(dart);
        if (left <= 1) break;
    }
    return count;
};

// all three darts of a visit on the bull, outer or inner
const isBullHatTrick = (darts) => {
    const thrown = upperDarts(darts);
    return thrown.length === 3 && thrown.every(dart => dart === 'S25' || dart === 'D25');
};

/**
 * What a single visit of the player shows in any game with visits: the hat
 * trick of bulls.
 */
const applyAnyVisit = (metrics, visit) => {
    if (isBullHatTrick(visit.darts)) metrics.bullHatTricks += 1;
};

/**
 * What an X01 visit of the player shows: bed and breakfast, three in a bed and
 * a bag of nuts. "before" is what the player had left before the visit, so a
 * bust (nothing taken off) does not count as a score.
 */
const applyX01Visit = (metrics, visit, before) => {
    applyAnyVisit(metrics, visit);
    if (sameDarts(visit.darts, BED_AND_BREAKFAST)) metrics.bedAndBreakfasts += 1;
    const thrown = upperDarts(visit.darts);
    if (thrown.length === 3 && thrown[0].startsWith('T') && thrown[0] !== 'T20' && thrown.every(dart => dart === thrown[0])) {
        metrics.threeInABeds += 1;
    }
    const scored = before !== undefined && Number.isFinite(visit.roundScore) && before - visit.roundScore === visit.scoreLeft;
    if (scored && visit.roundScore === BAG_OF_NUTS) metrics.bagsOfNuts += 1;
};

const toWin = (mode, count) => {
    const number = Number(count) || 1;
    return mode === 'First to' ? number : Math.floor(number / 2) + 1;
};

/**
 * Whether the player won the match in its deciding leg: before the last leg
 * they and their strongest opponent each needed one more leg (and one more set
 * in a match over sets). A match of a single leg has no deciding leg.
 */
export const wonInDecidingLeg = (game, playerId) => {
    const legsNeeded = toWin(game.legMode, game.numberOfLegs);
    const setsNeeded = toWin(game.setMode, game.numberOfSets);
    if (legsNeeded === 1 && setsNeeded === 1) return false;

    const sets = Object.entries(game.allSetsThrows ?? {})
        .sort(([a], [b]) => number(a) - number(b))
        .map(([, set]) => Object.entries(set ?? {}).sort(([a], [b]) => number(a) - number(b)).map(([, leg]) => leg).filter(Array.isArray));
    const winnerOf = (leg) => leg.find(visit => visit?.scoreLeft === 0)?.playerId;

    const setsWon = new Map();
    sets.slice(0, -1).forEach(legs => {
        const winner = winnerOf(legs.findLast(leg => winnerOf(leg)) ?? []);
        if (winner) setsWon.set(winner, (setsWon.get(winner) ?? 0) + 1);
    });
    const finished = (sets.at(-1) ?? []).filter(leg => winnerOf(leg));
    if (!finished.length || winnerOf(finished.at(-1)) !== playerId) return false;
    const legsWon = new Map();
    finished.slice(0, -1).forEach(leg => legsWon.set(winnerOf(leg), (legsWon.get(winnerOf(leg)) ?? 0) + 1));

    const opponents = (game.players ?? []).filter(id => id !== playerId);
    const onTheBrink = (id) => (legsWon.get(id) ?? 0) === legsNeeded - 1 && (setsWon.get(id) ?? 0) === setsNeeded - 1;
    return onTheBrink(playerId) && opponents.some(onTheBrink);
};

/**
 * Adds what can only be seen dart by dart: the visits, special finishes, the
 * nine-darter and short legs, and coming back from two legs down.
 */
const applyVisits = (metrics, game, playerId, won, lost) => {
    const legsWon = new Map();
    let wasBehind = false;
    let wasAhead = false;
    const startingScore = startingScoreOf(game, playerId);
    const doubleOut = outModeOf(game, playerId) === 'Double Out';

    for (const leg of legsInOrder(game)) {
        let left = startingScore;
        let busts = 0;
        let atDouble = 0;
        for (const visit of leg) {
            if (visit?.playerId !== playerId) continue;
            applyX01Visit(metrics, visit, left);
            if (doubleOut) atDouble += dartsAtDouble(visit.darts, left);
            if (visit.scoreLeft === left && left > 0 && visitScore(visit) > 0) busts += 1;
            if (Number.isFinite(visit.scoreLeft)) left = visit.scoreLeft;
        }
        if (busts >= BUSTS_IN_A_LEG) metrics.bustMasters += 1;
        if (atDouble >= DARTS_AT_DOUBLE) metrics.stuckOnDoubles += 1;

        const finish = leg.find(visit => visit?.scoreLeft === 0);
        if (!finish) continue;
        legsWon.set(finish.playerId, (legsWon.get(finish.playerId) ?? 0) + 1);

        if (finish.playerId === playerId) {
            const darts = upperDarts(finish.darts);
            if (sameDarts(finish.darts, SHANGHAI)) metrics.shanghaiFinishes += 1;
            if (darts.at(-1) === 'D1') metrics.madhouses += 1;
            if (darts.at(-1) === 'D20') metrics.doubleTops += 1;
            const dartsInLeg = leg.filter(visit => visit?.playerId === playerId)
                .reduce((sum, visit) => sum + thrownDarts(visit.darts).length, 0);
            if (startingScore === NINE_DARTER_SCORE && dartsInLeg <= NINE_DARTS) metrics.nineDarters += 1;
            if (doubleOut && atDouble === 1) metrics.firstDartCheckouts += 1;
            if (startingScore === SHORT_LEG_SCORE && dartsInLeg > 0 && (!metrics.bestLegDarts || dartsInLeg < metrics.bestLegDarts)) {
                metrics.bestLegDarts = dartsInLeg;
            }
        }

        const mine = legsWon.get(playerId) ?? 0;
        const bestOpponent = Math.max(0, ...[...legsWon].filter(([id]) => id !== playerId).map(([, legs]) => legs));
        if (bestOpponent - mine >= COMEBACK_DEFICIT) wasBehind = true;
        if (mine - bestOpponent >= COMEBACK_DEFICIT) wasAhead = true;
    }

    if (won && wasBehind) metrics.comebacks += 1;
    if (lost && wasAhead) metrics.bottledIts += 1;
    if (won && wonInDecidingLeg(game, playerId)) metrics.clutchWins += 1;
};

// three different trebles from 15 to 20 in one visit
const isWhiteHorse = (darts) => {
    const trebles = upperDarts(darts).filter(dart => dart.startsWith('T') && CRICKET_TREBLES.has(Number(dart.slice(1))));
    return trebles.length === 3 && new Set(trebles).size === 3;
};

/**
 * Cricket: the white horse and the hat trick of bulls in the visits, and the
 * marks per round of the game.
 */
const applyCricket = (metrics, game, model, playerId) => {
    for (const visit of game.allThrows ?? []) {
        if (visit?.playerId !== playerId) continue;
        applyAnyVisit(metrics, visit);
        if (isWhiteHorse(visit.darts)) metrics.whiteHorses += 1;
    }
    const rounds = Number(model.totalThrow?.game?.rounds ?? 0);
    if (rounds >= MIN_ROUNDS_FOR_MARKS) {
        metrics.bestMarksPerRound = Math.max(metrics.bestMarksPerRound, cricketMarks(model.hit) / rounds);
    }
};

const weekOf = (date) => Math.floor((new Date(date).getTime() - FIRST_MONDAY_MS) / WEEK_MS);
const dayOf = (date) => Math.floor(new Date(date).getTime() / DAY_MS);

/**
 * Keeps track of the weeks in which the player played or trained.
 */
const applyWeek = (metrics, date) => {
    const time = new Date(date).getTime();
    if (metrics.firstAt === null) metrics.firstAt = time;
    metrics.daysSinceFirst = Math.floor((time - metrics.firstAt) / DAY_MS);

    const week = weekOf(date);
    if (metrics.lastWeek === week) return;
    metrics.weekStreak = metrics.lastWeek === week - 1 ? metrics.weekStreak + 1 : 1;
    metrics.bestWeekStreak = Math.max(metrics.bestWeekStreak, metrics.weekStreak);
    metrics.lastWeek = week;
};

/**
 * The weekly streak as of now: still alive while the player played this week
 * or last week (this week is not over yet).
 */
export const currentWeekStreak = (metrics, now = new Date()) =>
    metrics.lastWeek !== null && metrics.lastWeek >= weekOf(now) - 1 ? metrics.weekStreak : 0;

/**
 * Whether the player finished alone in last place of a game of three or more:
 * fewest legs in X01, fewest points in Cricket and Elimination, the last rank
 * in Around the Clock. A shared last place is nobody's.
 */
export const isLast = (type, game, playerId) => {
    const players = game.players ?? [];
    if (players.length < MIN_PLAYERS_FOR_LAST) return false;
    const model = (id) => game.playerModels?.[id] ?? {};
    const value = {
        x01: (id) => model(id).legsWon?.game ?? 0,
        cricket: (id) => Number(model(id).score ?? 0),
        elimination: (id) => Number(model(id).score ?? 0),
        // a higher rank is worse: turn it around so the lowest value is last
        clock: (id) => -(model(id).rank ?? 0),
    }[type];
    if (!value || model(playerId).hasWonGame) return false;
    const mine = value(playerId);
    return players.filter(id => id !== playerId).every(id => value(id) > mine);
};

const applyGame = (metrics, type, game, playerId) => {
    const model = game.playerModels?.[playerId] ?? {};
    const opponents = (game.players ?? []).filter(id => id !== playerId);
    const won = Boolean(model.hasWonGame);
    // beating nobody is practice, not a win
    const competitive = opponents.length > 0;

    metrics.games += 1;
    metrics.darts += (type === 'clock' ? model.darts : type === 'elimination' ? model.totalThrow?.darts : model.totalThrow?.game?.darts) ?? 0;

    if (competitive) {
        for (const id of opponents) metrics.opponentIds.add(String(id));
        metrics.opponents = metrics.opponentIds.size;
        if (won) {
            metrics.wins += 1;
            metrics.streak += 1;
            metrics.lossStreak = 0;
            if (metrics.streak === WINS_TO_WARM_UP) metrics.warmUps += 1;
            if (opponents.length >= MIN_PLAYERS_FOR_LAST - 1) metrics.bigGameWins += 1;
            metrics.bestStreak = Math.max(metrics.bestStreak, metrics.streak);
            metrics[{ x01: 'winsX01', cricket: 'winsCricket', elimination: 'winsElimination', clock: 'winsClock' }[type]] += 1;
            metrics.gameTypesWon = ['winsX01', 'winsCricket', 'winsElimination'].filter(key => metrics[key] > 0).length;
        } else {
            metrics.streak = 0;
            metrics.lossStreak += 1;
            if (metrics.lossStreak === LOSING_STREAK) metrics.coldSpells += 1;
            if (isLast(type, game, playerId)) metrics.woodenSpoons += 1;
        }
    }

    if (type === 'cricket') applyCricket(metrics, game, model, playerId);
    if (type === 'elimination') {
        for (const visit of game.allThrows ?? []) if (visit?.playerId === playerId) applyAnyVisit(metrics, visit);
    }
    if (type !== 'x01') return;

    const ranges = model.scoreRanges?.game ?? {};
    const visitsIn = (keys) => keys.reduce((sum, key) => sum + (Number(ranges[key]) || 0), 0);
    metrics.tonPlusVisits += visitsIn(['100-119', '120-139', '140-159', '160-179', '180']);
    metrics.nothingDoings += visitsIn(['ZERO']);
    metrics.tonFortyVisits += visitsIn(['140-159', '160-179', '180']);
    metrics.num180s += model.scoreRanges?.game?.['180'] ?? 0;
    for (const [score, count] of Object.entries(model.checkoutScores?.game ?? {})) {
        const times = Number(count) || 0;
        if (Number(score) >= HIGH_FINISH) metrics.highFinishes += times;
        if (Number(score) === BIG_FISH) metrics.bigFishes += times;
        if (Number(score) >= BIG_CHECKOUT) metrics.bigCheckouts += times;
    }
    metrics.bullFinishes += model.checkout?.sections?.['25']?.hit ?? 0;

    if ((model.totalThrow?.game?.rounds ?? 0) >= MIN_ROUNDS_FOR_AVERAGE) {
        metrics.bestAverage = Math.max(metrics.bestAverage, model.averages?.game?.overall ?? 0);
    }

    if ((model.scoreRanges?.game?.['180'] ?? 0) >= 3) metrics.maxHatTricks += 1;
    applyVisits(metrics, game, playerId, competitive && won, competitive && !won);

    const legs = (id) => game.playerModels?.[id]?.legsWon?.game ?? 0;
    if (competitive && won && legs(playerId) >= MIN_LEGS_FOR_WHITEWASH && opponents.every(id => legs(id) === 0)) {
        metrics.whitewashes += 1;
    }
    if (competitive && !won && legs(playerId) === 0 && Math.max(0, ...opponents.map(legs)) >= MIN_LEGS_FOR_WHITEWASH) {
        metrics.whitewashedLosses += 1;
    }
};

/**
 * The days and weeks with a training: one evening with ten trainings is one
 * training day.
 */
const applyTrainingDay = (metrics, date) => {
    const day = dayOf(date);
    if (metrics.lastTrainingDay !== day) {
        metrics.trainingDays += 1;
        metrics.lastTrainingDay = day;
    }
    const week = weekOf(date);
    if (metrics.lastTrainingWeek === week) return;
    metrics.trainingWeekStreak = metrics.lastTrainingWeek === week - 1 ? metrics.trainingWeekStreak + 1 : 1;
    metrics.bestTrainingWeekStreak = Math.max(metrics.bestTrainingWeekStreak, metrics.trainingWeekStreak);
    metrics.lastTrainingWeek = week;
};

const applyTraining = (metrics, entry, date) => {
    metrics.trainings += 1;
    applyTrainingDay(metrics, date);
    if (TRAINING_MODES.includes(entry.mode)) {
        metrics.trainingModesDone.add(entry.mode);
        metrics.trainingModes = metrics.trainingModesDone.size;
    }
    if (entry.scoring === 'Darts' && entry.mode === 'Single' && entry.darts > 0 && (!metrics.bestSinglesDarts || entry.darts < metrics.bestSinglesDarts)) {
        metrics.bestSinglesDarts = entry.darts;
    }
    // the best time per mode, and the fewest darts per mode next to it
    const darts = entry.scoring === 'Darts';
    const key = darts ? `darts:${entry.mode ?? ''}` : entry.mode ?? '';
    const score = darts ? entry.darts : entry.timeMs;
    if (!score) return;
    const best = metrics.bestTrainingTimes[key];
    if (best !== undefined && score < best) metrics.trainingRecords += 1;
    if (best === undefined || score < best) metrics.bestTrainingTimes[key] = score;
};

/**
 * Replays a player's history and returns the badges earned along the way plus
 * the final metrics (for progress towards the next tiers).
 *
 * events: [{ type: 'x01' | 'cricket' | 'elimination' | 'clock' | 'atc', id, at: Date, data }]
 */
export const replayBadges = (events, playerId) => {
    const metrics = newMetrics();
    const earned = [];
    const earnedIds = new Set();
    // the Hall of Shame: each time it happened, and the good deeds that washed it off
    const shame = [];
    const washes = [];
    // per shame badge: whether the last one is still unwashed
    const open = new Set();

    for (const event of [...events].sort((a, b) => a.at - b.at)) {
        const before = Object.fromEntries(SHAME_BADGES.flatMap(badge => [[badge.metric, metrics[badge.metric]], [badge.washMetric, metrics[badge.washMetric]]]));
        if (event.type === 'atc') applyTraining(metrics, event.data, event.at);
        else applyGame(metrics, event.type, event.data, playerId);
        applyWeek(metrics, event.at);

        const source = { at: event.at, sourceType: event.type, sourceId: event.id };
        // a good deed first, so a shame in the same game stays
        for (const badge of SHAME_BADGES) {
            if (open.has(badge.id) && metrics[badge.washMetric] > before[badge.washMetric]) {
                washes.push({ badge: badge.id, ...source });
                open.delete(badge.id);
            }
        }
        for (const badge of SHAME_BADGES) {
            const count = metrics[badge.metric] - before[badge.metric];
            if (count > 0) {
                shame.push({ badge: badge.id, count, club: event.data?.club ? String(event.data.club) : null, ...source });
                open.add(badge.id);
            }
        }

        for (const badge of BADGES) {
            if (!earnedIds.has(badge.id) && reached(badge, metrics[badge.metric])) {
                earnedIds.add(badge.id);
                earned.push({ badge: badge.id, earnedAt: event.at, sourceType: event.type, sourceId: event.id });
            }
        }
    }

    return { earned, metrics, shame, washes };
};
