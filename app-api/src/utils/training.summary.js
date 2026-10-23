import { rulesTrainingBests } from './rules.stats.js';

const DAY = 24 * 60 * 60 * 1000;
const average = (values) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null);

/**
 * All the trainings of a player in one: how many, how many in the last 30
 * days, and per kind the bests.
 * atc: Around the Clock entries; bots: X01 trainings against the bot (finished
 * or not); rules: the trainings of the rules engine (Bob's 27, …).
 * → { total, last30Days, lastAt, atc: { count, fastest: { timeMs, mode }, fewestDarts: { darts, mode }, recent: [timeMs|darts] },
 *     bot: { count, finished, wins, average, bestAverage, recent: [average] }, rules: { [kind]: { count, best, latest } } }
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
        },
        rules: rulesTrainingBests(rules),
    };
};
