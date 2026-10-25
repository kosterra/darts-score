import { rulesTrainingBests } from './rules.stats.js';

const DAY = 24 * 60 * 60 * 1000;
const average = (values) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null);
const TON_PLUS = ['100-119', '120-139', '140-159', '160-179', '180'];
// a double counts as the best one from this many tries on
export const DOUBLE_TRIES = 5;

// the day of a date, as a number of days (UTC), to count days in a row
const dayOf = (time) => Math.floor(time / DAY);

/**
 * The days in a row up to today (or yesterday, when today has no training
 * yet) with at least one training.
 */
export const trainingStreak = (times, now = new Date()) => {
    const days = new Set(times.map(dayOf));
    let day = dayOf(now.getTime());
    if (!days.has(day)) day -= 1;
    let streak = 0;
    while (days.has(day)) { streak += 1; day -= 1; }
    return streak;
};

/**
 * The X01 figures of the trainings against the bot, over every visit the
 * player threw there: checkouts (hit and tried), the double hit best, 180s,
 * visits of 100 and more, the highest checkout; and the scoring and finishing
 * averages of the finished ones.
 */
const botFigures = (bots, finished, playerId) => {
    const modelOf = (training) => training.playerModels?.[playerId] ?? {};
    const checkout = { hit: 0, total: 0 };
    const sections = {};
    let oneEighties = 0;
    let tonPlus = 0;
    let highestCheckout = 0;
    for (const training of bots) {
        const model = modelOf(training);
        checkout.hit += model.checkout?.game?.hit ?? 0;
        checkout.total += model.checkout?.game?.total ?? 0;
        for (const [section, tries] of Object.entries(model.checkout?.sections ?? {})) {
            const entry = sections[section] ?? (sections[section] = { hit: 0, total: 0 });
            entry.hit += tries.hit ?? 0;
            entry.total += tries.total ?? 0;
        }
        const ranges = model.scoreRanges?.game ?? {};
        oneEighties += ranges['180'] ?? 0;
        tonPlus += TON_PLUS.reduce((sum, range) => sum + (ranges[range] ?? 0), 0);
        highestCheckout = Math.max(highestCheckout, ...Object.keys(model.checkoutScores?.game ?? {}).map(Number).filter(Number.isFinite), 0);
    }
    const rate = (entry) => (entry.total ? Math.round((entry.hit / entry.total) * 1000) / 10 : null);
    const bestDouble = Object.entries(sections)
        .filter(([, entry]) => entry.total >= DOUBLE_TRIES && entry.hit > 0)
        .map(([section, entry]) => ({ section: Number(section), hit: entry.hit, total: entry.total, rate: rate(entry) }))
        .sort((a, b) => b.rate - a.rate || b.total - a.total)[0] ?? null;
    const part = (name) => average(finished.map(training => Number(modelOf(training).averages?.game?.[name] ?? 0)).filter(value => value > 0));
    return {
        checkout: { ...checkout, rate: rate(checkout) },
        bestDouble,
        oneEighties,
        tonPlus,
        highestCheckout: highestCheckout || null,
        scoring: part('begMidGame'),
        finishing: part('endGame'),
    };
};

/**
 * All the trainings of a player in one: how many, how many in the last 30
 * days, and per kind the bests.
 * atc: Around the Clock entries; bots: X01 trainings against the bot (finished
 * or not); rules: the trainings of the rules engine (Bob's 27, …).
 * → { total, last30Days, lastAt, streak, atc: { count, fastest: { timeMs, mode }, fewestDarts: { darts, mode } },
 *     bot: { count, finished, wins, average, bestAverage, recent: [average], checkout: { hit, total, rate },
 *            bestDouble: { section, hit, total, rate }, oneEighties, tonPlus, highestCheckout, scoring, finishing },
 *     rules: { [kind]: { count, best, latest } } }
 */
export const trainingSummary = ({ atc = [], bots = [], rules = [], playerId, now = new Date() }) => {
    const dates = [...atc.map(entry => entry.createdAt), ...bots.map(entry => entry.createdAt), ...rules.map(entry => entry.createdAt)]
        .filter(Boolean).map(date => new Date(date).getTime());
    const since = now.getTime() - 30 * DAY;

    const timed = atc.filter(entry => entry.scoring !== 'Darts' && entry.timeMs);
    const darted = atc.filter(entry => entry.scoring === 'Darts' && entry.darts);
    const fastest = timed.reduce((best, entry) => (!best || entry.timeMs < best.timeMs ? entry : best), null);
    const fewest = darted.reduce((best, entry) => (!best || entry.darts < best.darts ? entry : best), null);

    const finished = bots.filter(training => training.hasWinner);
    const averageOf = (training) => Number(training.playerModels?.[playerId]?.averages?.game?.overall ?? 0);
    const averages = finished.map(averageOf).filter(value => value > 0);

    return {
        total: dates.length,
        last30Days: dates.filter(date => date >= since).length,
        lastAt: dates.length ? new Date(Math.max(...dates)) : null,
        streak: trainingStreak(dates, now),
        atc: {
            count: atc.length,
            fastest: fastest ? { timeMs: fastest.timeMs, mode: fastest.mode ?? 'All' } : null,
            fewestDarts: fewest ? { darts: fewest.darts, mode: fewest.mode ?? 'All' } : null,
        },
        bot: {
            count: bots.length,
            finished: finished.length,
            wins: finished.filter(training => training.playerModels?.[playerId]?.hasWonGame).length,
            average: average(averages),
            bestAverage: averages.length ? Math.round(Math.max(...averages) * 10) / 10 : null,
            // the last ten averages, oldest first
            recent: averages.slice(-10).map(value => Math.round(value * 10) / 10),
            ...botFigures(bots, finished, playerId),
        },
        rules: rulesTrainingBests(rules),
    };
};
