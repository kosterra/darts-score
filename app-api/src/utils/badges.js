/**
 * Badges players collect. Each group counts one thing (a "metric") and has
 * tiers that are earned when the metric reaches the tier's target.
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
        group: 'madhouse', category: 'finishing', title: 'Madhouse', metric: 'madhouses',
        describe: () => 'Check out on double 1, the most dreaded finish',
        tiers: [[1, 'Madhouse']],
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
        group: 'bedAndBreakfast', category: 'scoring', title: 'Bed and breakfast', metric: 'bedAndBreakfasts',
        describe: () => 'Score 26 in one visit with single 20, single 5 and single 1: aiming at the treble 20 and landing in its neighbours, the most common unlucky visit in darts',
        tiers: [[1, 'Bed and Breakfast']],
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
        describe: (n) => `Throw ${new Intl.NumberFormat('en').format(n)} darts`,
        tiers: [[1000, 'A Thousand Darts'], [10000, 'Ten Thousand Darts'], [50000, 'Dart Marathon']],
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
];

/**
 * Every single badge, flattened from the groups.
 */
export const BADGES = BADGE_GROUPS.flatMap(({ group, category, title, metric, describe, tiers }) =>
    tiers.map(([target, name], index) => ({
        id: `${group}-${target}`,
        group,
        groupTitle: title,
        category,
        metric,
        title: name,
        description: describe(target),
        target,
        tier: index + 1,
        tiers: tiers.length,
    })));

export const getBadge = (id) => BADGES.find(badge => badge.id === id);

const newMetrics = () => ({
    games: 0, wins: 0, streak: 0, bestStreak: 0, num180s: 0, highFinishes: 0, bullFinishes: 0, bigFishes: 0,
    whitewashes: 0, shanghaiFinishes: 0, nineDarters: 0, madhouses: 0, bedAndBreakfasts: 0, maxHatTricks: 0, comebacks: 0,
    weekStreak: 0, bestWeekStreak: 0, lastWeek: null, bestAverage: 0, winsX01: 0, winsCricket: 0, winsElimination: 0, gameTypesWon: 0,
    darts: 0, trainings: 0, trainingRecords: 0, bestTrainingTimes: {},
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

/**
 * Adds what can only be seen dart by dart: special finishes, the nine-darter,
 * bed and breakfast, and coming back from two legs down.
 */
const applyVisits = (metrics, game, playerId, won) => {
    const legsWon = new Map();
    let wasBehind = false;

    for (const leg of legsInOrder(game)) {
        for (const visit of leg) {
            if (visit?.playerId === playerId && sameDarts(visit.darts, BED_AND_BREAKFAST)) metrics.bedAndBreakfasts += 1;
        }

        const finish = leg.find(visit => visit?.scoreLeft === 0);
        if (!finish) continue;
        legsWon.set(finish.playerId, (legsWon.get(finish.playerId) ?? 0) + 1);

        if (finish.playerId === playerId) {
            const darts = thrownDarts(finish.darts);
            if (sameDarts(finish.darts, SHANGHAI)) metrics.shanghaiFinishes += 1;
            if (darts.at(-1)?.toUpperCase() === 'D1') metrics.madhouses += 1;
            const dartsInLeg = leg.filter(visit => visit?.playerId === playerId)
                .reduce((sum, visit) => sum + thrownDarts(visit.darts).length, 0);
            if (Number(game.startingScore) === NINE_DARTER_SCORE && dartsInLeg <= NINE_DARTS) metrics.nineDarters += 1;
        }

        const mine = legsWon.get(playerId) ?? 0;
        const bestOpponent = Math.max(0, ...[...legsWon].filter(([id]) => id !== playerId).map(([, legs]) => legs));
        if (bestOpponent - mine >= COMEBACK_DEFICIT) wasBehind = true;
    }

    if (won && wasBehind) metrics.comebacks += 1;
};

const weekOf = (date) => Math.floor((new Date(date).getTime() - FIRST_MONDAY_MS) / WEEK_MS);

/**
 * Keeps track of the weeks in which the player played or trained.
 */
const applyWeek = (metrics, date) => {
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

const applyGame = (metrics, type, game, playerId) => {
    const model = game.playerModels?.[playerId] ?? {};
    const opponents = (game.players ?? []).filter(id => id !== playerId);
    const won = Boolean(model.hasWonGame);
    // beating nobody is practice, not a win
    const competitive = opponents.length > 0;

    metrics.games += 1;
    metrics.darts += (type === 'elimination' ? model.totalThrow?.darts : model.totalThrow?.game?.darts) ?? 0;

    if (competitive) {
        if (won) {
            metrics.wins += 1;
            metrics.streak += 1;
            metrics.bestStreak = Math.max(metrics.bestStreak, metrics.streak);
            metrics[{ x01: 'winsX01', cricket: 'winsCricket', elimination: 'winsElimination' }[type]] += 1;
            metrics.gameTypesWon = ['winsX01', 'winsCricket', 'winsElimination'].filter(key => metrics[key] > 0).length;
        } else {
            metrics.streak = 0;
        }
    }

    if (type !== 'x01') return;

    metrics.num180s += model.scoreRanges?.game?.['180'] ?? 0;
    for (const [score, count] of Object.entries(model.checkoutScores?.game ?? {})) {
        const times = Number(count) || 0;
        if (Number(score) >= HIGH_FINISH) metrics.highFinishes += times;
        if (Number(score) === BIG_FISH) metrics.bigFishes += times;
    }
    metrics.bullFinishes += model.checkout?.sections?.['25']?.hit ?? 0;

    if ((model.totalThrow?.game?.rounds ?? 0) >= MIN_ROUNDS_FOR_AVERAGE) {
        metrics.bestAverage = Math.max(metrics.bestAverage, model.averages?.game?.overall ?? 0);
    }

    if ((model.scoreRanges?.game?.['180'] ?? 0) >= 3) metrics.maxHatTricks += 1;
    applyVisits(metrics, game, playerId, competitive && won);

    const legs = (id) => game.playerModels?.[id]?.legsWon?.game ?? 0;
    if (competitive && won && legs(playerId) >= MIN_LEGS_FOR_WHITEWASH && opponents.every(id => legs(id) === 0)) {
        metrics.whitewashes += 1;
    }
};

const applyTraining = (metrics, entry) => {
    metrics.trainings += 1;
    const mode = entry.mode ?? '';
    const best = metrics.bestTrainingTimes[mode];
    if (best !== undefined && entry.timeMs < best) metrics.trainingRecords += 1;
    if (best === undefined || entry.timeMs < best) metrics.bestTrainingTimes[mode] = entry.timeMs;
};

/**
 * Replays a player's history and returns the badges earned along the way plus
 * the final metrics (for progress towards the next tiers).
 *
 * events: [{ type: 'x01' | 'cricket' | 'elimination' | 'atc', id, at: Date, data }]
 */
export const replayBadges = (events, playerId) => {
    const metrics = newMetrics();
    const earned = [];
    const earnedIds = new Set();

    for (const event of [...events].sort((a, b) => a.at - b.at)) {
        if (event.type === 'atc') applyTraining(metrics, event.data);
        else applyGame(metrics, event.type, event.data, playerId);
        applyWeek(metrics, event.at);

        for (const badge of BADGES) {
            if (!earnedIds.has(badge.id) && metrics[badge.metric] >= badge.target) {
                earnedIds.add(badge.id);
                earned.push({ badge: badge.id, earnedAt: event.at, sourceType: event.type, sourceId: event.id });
            }
        }
    }

    return { earned, metrics };
};
