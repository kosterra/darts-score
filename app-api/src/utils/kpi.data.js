import { legsInOrder, thrownDarts } from './badges.js';
import { startingScoreOf } from './x01.rules.js';

// Key figures of a player per game type, for the statistics page.

const model = (game, playerId) => game.playerModels?.[playerId] ?? {};
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const average = (values) => values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
const max = (values) => values.length ? Math.max(...values) : null;
const min = (values) => values.length ? Math.min(...values) : null;

/**
 * The player's visits in one X01 leg with what each really scored: the
 * points it took off, so a busted visit scores 0.
 */
export const legVisits = (game, leg, playerId) => {
    let left = startingScoreOf(game, playerId);
    return leg.filter(visit => visit?.playerId === playerId).map(visit => {
        const scoreLeft = Number(visit.scoreLeft);
        const score = Math.max(0, left - scoreLeft);
        left = scoreLeft;
        return { score, darts: thrownDarts(visit.darts).length };
    });
};

/**
 * X01: average of the first three visits of a leg ("first 9"), the fewest
 * darts for a won 501 leg, visits of 100 or more, the highest visit and legs won.
 */
export const x01Kpis = (x01Games, playerId) => {
    const firstNine = [];
    const visits = [];
    const best501Legs = [];
    let legsWon = 0;

    for (const game of x01Games) {
        for (const leg of legsInOrder(game)) {
            const own = legVisits(game, leg, playerId);
            firstNine.push(...own.slice(0, 3).map(visit => visit.score));
            visits.push(...own.map(visit => visit.score));
            const finish = leg.find(visit => Number(visit?.scoreLeft) === 0);
            if (finish?.playerId !== playerId) continue;
            legsWon += 1;
            if (startingScoreOf(game, playerId) === 501) best501Legs.push(own.reduce((sum, visit) => sum + visit.darts, 0));
        }
    }

    return {
        firstNineAverage: average(firstNine),
        bestLeg: min(best501Legs.filter(darts => darts > 0)),
        tonPlus: visits.filter(score => score >= 100).length,
        highestVisit: max(visits),
        legsWon,
    };
};

const CRICKET_SECTIONS = new Set([15, 16, 17, 18, 19, 20, 25]);
const MULTIPLIER = { S: 1, D: 2, T: 3 };

// marks of one Cricket game from its hits ({ T20: 2, S25: 1, … }); only 15–20 and the bull count
const cricketMarks = (hits = {}) => Object.entries(hits).reduce((sum, [dart, count]) => {
    const section = Number(dart.slice(1));
    return CRICKET_SECTIONS.has(section) ? sum + (MULTIPLIER[dart[0]] ?? 0) * Number(count || 0) : sum;
}, 0);

/**
 * Cricket: marks per round overall and in the best game, and the average points.
 */
export const cricketKpis = (cricketGames, playerId) => {
    let marks = 0;
    let rounds = 0;
    const perGame = [];
    const points = [];
    for (const game of cricketGames) {
        const playerModel = model(game, playerId);
        const gameMarks = cricketMarks(playerModel.hit);
        const gameRounds = Number(playerModel.totalThrow?.game?.rounds ?? 0);
        if (gameRounds > 0) {
            marks += gameMarks;
            rounds += gameRounds;
            perGame.push(gameMarks / gameRounds);
        }
        if (playerModel.score != null) points.push(Number(playerModel.score));
    }
    return {
        marksPerRound: rounds ? round(marks / rounds, 2) : null,
        bestMarksPerRound: perGame.length ? round(Math.max(...perGame), 2) : null,
        averagePoints: average(points),
    };
};

/**
 * Around the Clock: games and wins, the fewest darts of a finished game, the
 * darts on average, the hit rate and darts thrown.
 */
export const clockKpis = (clockGames, playerId) => {
    const models = clockGames.map(game => model(game, playerId));
    const finished = models.filter(entry => entry.finished && entry.darts);
    const darts = models.reduce((sum, entry) => sum + (entry.darts ?? 0), 0);
    const hits = models.reduce((sum, entry) => sum + (entry.hits ?? 0), 0);
    return {
        games: clockGames.length,
        wins: models.filter(entry => entry.hasWonGame === true).length,
        fewestDarts: finished.length ? Math.min(...finished.map(entry => entry.darts)) : null,
        averageDarts: average(finished.map(entry => entry.darts)),
        hitRate: darts ? Math.round(hits / darts * 1000) / 10 : null,
        dartsThrown: darts,
    };
};

/**
 * Elimination: games and wins, the average and best visit, and darts thrown.
 */
export const eliminationKpis = (eliminationGames, playerId) => {
    const visits = eliminationGames.flatMap(game =>
        (Array.isArray(game.allThrows) ? game.allThrows : []).filter(visit => visit?.playerId === playerId));
    const scores = visits.map(visit => Number(visit.roundScore ?? 0));
    return {
        games: eliminationGames.length,
        wins: eliminationGames.filter(game => model(game, playerId).hasWonGame === true).length,
        averageVisit: average(scores),
        bestVisit: max(scores),
        dartsThrown: visits.reduce((sum, visit) => sum + thrownDarts(visit.darts).length, 0),
    };
};
