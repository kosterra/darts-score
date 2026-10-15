import dayjs from 'dayjs';
import { legsInOrder, thrownDarts } from './badges.js';

/**
 * Data for the statistics charts, worked out from a player's finished games.
 * Every function takes plain game documents and a player id.
 */

const model = (game, playerId) => game.playerModels?.[playerId] ?? {};
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const finishedAt = (game) => game.updatedAt ?? game.createdAt;

/**
 * Three-dart average of every X01 game, oldest first.
 */
export const averageTrend = (x01Games, playerId) => x01Games
    .map(game => ({
        gameId: String(game._id ?? game.id),
        date: finishedAt(game),
        average: round(model(game, playerId).averages?.game?.overall ?? 0),
        rounds: model(game, playerId).totalThrow?.game?.rounds ?? 0,
    }))
    .filter(entry => entry.rounds > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(({ rounds, ...entry }) => entry); // eslint-disable-line no-unused-vars

/**
 * Games, wins and X01 average per month, oldest first.
 * games: [{ type: 'x01' | 'cricket' | ..., game }]
 */
export const monthlyForm = (games, playerId) => {
    const months = new Map();
    for (const { type, game } of games) {
        const month = dayjs(finishedAt(game)).format('YYYY-MM');
        const entry = months.get(month) ?? { month, games: 0, wins: 0, points: 0, rounds: 0 };
        const playerModel = model(game, playerId);
        entry.games += 1;
        if (playerModel.hasWonGame && (game.players ?? []).length > 1) entry.wins += 1;
        if (type === 'x01') {
            const rounds = playerModel.totalThrow?.game?.rounds ?? 0;
            entry.points += (playerModel.averages?.game?.overall ?? 0) * rounds;
            entry.rounds += rounds;
        }
        months.set(month, entry);
    }
    return [...months.values()]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(({ month, games: count, wins, points, rounds }) => ({
            month,
            games: count,
            wins,
            winRate: round(wins / count * 100, 0),
            average: rounds ? round(points / rounds) : null,
        }));
};

/**
 * Average while scoring (start and middle of a leg) and while finishing
 * (the end of a leg), each weighted by the rounds played in that phase.
 */
export const scoringVsFinishing = (x01Games, playerId) => {
    const phase = (averageKey, roundsKey) => {
        let points = 0;
        let rounds = 0;
        for (const game of x01Games) {
            const playerModel = model(game, playerId);
            const phaseRounds = playerModel[roundsKey]?.game?.rounds ?? 0;
            points += (playerModel.averages?.game?.[averageKey] ?? 0) * phaseRounds;
            rounds += phaseRounds;
        }
        return rounds ? round(points / rounds) : 0;
    };
    return {
        opening: phase('begMidGame', 'totalThrowBegMidGame'),
        finishing: phase('endGame', 'totalThrowEndGame'),
    };
};

export const DARTS_PER_LEG_BUCKETS = [
    { label: '9', max: 9 },
    { label: '10–12', max: 12 },
    { label: '13–15', max: 15 },
    { label: '16–18', max: 18 },
    { label: '19–21', max: 21 },
    { label: '22–24', max: 24 },
    { label: '25–30', max: 30 },
    { label: '31+', max: Infinity },
];

/**
 * How many darts the player needed for the 501 legs they won.
 */
export const dartsPerLegDistribution = (x01Games, playerId) => {
    const counts = DARTS_PER_LEG_BUCKETS.map(bucket => ({ bucket: bucket.label, count: 0 }));
    for (const game of x01Games.filter(g => Number(g.startingScore) === 501)) {
        for (const leg of legsInOrder(game)) {
            const finish = leg.find(visit => visit?.scoreLeft === 0);
            if (finish?.playerId !== playerId) continue;
            const darts = leg.filter(visit => visit?.playerId === playerId)
                .reduce((sum, visit) => sum + thrownDarts(visit.darts).length, 0);
            const index = DARTS_PER_LEG_BUCKETS.findIndex(bucket => darts <= bucket.max);
            counts[index].count += 1;
        }
    }
    return counts;
};

/**
 * Around the Clock times per mode, oldest first, each with the best time so far.
 */
export const trainingProgress = (entries) => {
    const byMode = {};
    for (const entry of [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
        const list = (byMode[entry.mode ?? 'All'] ??= []);
        const best = Math.min(entry.timeMs, list.at(-1)?.best ?? Infinity);
        list.push({ date: entry.createdAt, timeMs: entry.timeMs, best });
    }
    return byMode;
};
