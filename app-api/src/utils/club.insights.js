import { legsInOrder, thrownDarts } from './badges.js';
import { legVisits } from './kpi.data.js';
import { startingScoreOf } from './x01.rules.js';

// Club-wide figures for the dashboard: key figures, who beats whom, records
// and a small log of when games were played (the browser groups it by day and
// hour in the visitor's time zone).

const model = (game, playerId) => game.playerModels?.[playerId] ?? {};
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const monthKey = (date) => new Date(date).toISOString().slice(0, 7);
const finishedAt = (game) => game.updatedAt ?? game.createdAt;

/**
 * Key figures over the club's finished games ("finishedByType": [{ type, games }]).
 * "members" are the club's players (not guests) with their activity, "now" the current time.
 */
export const clubKpis = ({ finishedByType, allGames, members, now = new Date() }) => {
    const memberIds = new Set(members.map(player => String(player._id)));
    const x01 = finishedByType.find(entry => entry.type === 'x01')?.games ?? [];
    const finished = finishedByType.flatMap(entry => entry.games);

    let checkoutHit = 0, checkoutTotal = 0, pointsTimesRounds = 0, rounds = 0, num180s = 0, legs = 0, darts = 0;
    let highestCheckout = null, bestLeg = null;

    for (const game of x01) {
        for (const playerId of game.players ?? []) {
            const playerModel = model(game, playerId);
            checkoutHit += playerModel.checkout?.game?.hit ?? 0;
            checkoutTotal += playerModel.checkout?.game?.total ?? 0;
            const playerRounds = playerModel.totalThrow?.game?.rounds ?? 0;
            pointsTimesRounds += (playerModel.averages?.game?.overall ?? 0) * playerRounds;
            rounds += playerRounds;
            num180s += playerModel.scoreRanges?.game?.['180'] ?? 0;
            for (const checkout of Object.keys(playerModel.checkoutScores?.game ?? {}).map(Number).filter(Boolean)) {
                if (!highestCheckout || checkout > highestCheckout.value) highestCheckout = { value: checkout, player: playerId };
            }
        }
        for (const leg of legsInOrder(game)) {
            legs += 1;
            const finish = leg.find(visit => Number(visit?.scoreLeft) === 0);
            if (finish && startingScoreOf(game, finish.playerId) === 501) {
                const legDarts = legVisits(game, leg, finish.playerId).reduce((sum, visit) => sum + visit.darts, 0);
                if (legDarts > 0 && (!bestLeg || legDarts < bestLeg.value)) bestLeg = { value: legDarts, player: finish.playerId };
            }
        }
    }
    for (const { type, games } of finishedByType) {
        for (const game of games) {
            for (const playerId of game.players ?? []) {
                const playerModel = model(game, playerId);
                darts += (type === 'clock' ? playerModel.darts : type === 'elimination' ? playerModel.totalThrow?.darts : playerModel.totalThrow?.game?.darts) ?? 0;
            }
        }
    }

    const thisMonth = monthKey(now);
    const lastMonthDate = new Date(now);
    lastMonthDate.setUTCDate(1);
    lastMonthDate.setUTCMonth(lastMonthDate.getUTCMonth() - 1);
    const lastMonth = monthKey(lastMonthDate);
    const gamesIn = (month) => finished.filter(game => monthKey(finishedAt(game)) === month);
    const activePlayers = new Set(gamesIn(thisMonth).flatMap(game => (game.players ?? []).filter(id => memberIds.has(String(id)))));

    const streakHolder = [...members].sort((a, b) => (b.activity?.bestWeekStreak ?? 0) - (a.activity?.bestWeekStreak ?? 0))[0];

    return {
        gamesStarted: allGames.length,
        gamesFinished: finished.length,
        gamesThisMonth: gamesIn(thisMonth).length,
        gamesLastMonth: gamesIn(lastMonth).length,
        activePlayersThisMonth: activePlayers.size,
        x01Average: rounds ? round(pointsTimesRounds / rounds, 1) : null,
        checkoutHit,
        checkoutTotal,
        num180s,
        highestCheckout,
        bestLeg,
        legsPlayed: legs,
        dartsThrown: darts,
        longestStreak: streakHolder?.activity?.bestWeekStreak
            ? { value: streakHolder.activity.bestWeekStreak, player: String(streakHolder._id) }
            : null,
    };
};

/**
 * Who beats whom: in every finished game the winner beats each other player.
 * The players who played most (up to "limit") form the rows and columns.
 */
export const headToHead = (finishedByType, memberIds, limit = 8) => {
    const games = new Map();
    const wins = {};
    for (const { games: list } of finishedByType) {
        for (const game of list) {
            const players = (game.players ?? []).map(String).filter(id => memberIds.has(id));
            players.forEach(id => games.set(id, (games.get(id) ?? 0) + 1));
            const winner = players.find(id => model(game, id).hasWonGame);
            if (!winner) continue;
            for (const other of players.filter(id => id !== winner)) {
                wins[winner] ??= {};
                wins[winner][other] = (wins[winner][other] ?? 0) + 1;
            }
        }
    }
    const players = [...games.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
    return { players, wins };
};

/**
 * Club records from finished X01 games, each with who set it and when:
 * best 501 leg, highest checkout, most 180s in one game and best game average.
 */
export const clubRecords = (x01Games) => {
    const records = { bestLeg: null, highestCheckout: null, most180sInGame: null, bestGameAverage: null };
    const better = (key, candidate, lowerWins = false) => {
        const current = records[key];
        if (!current || (lowerWins ? candidate.value < current.value : candidate.value > current.value)) records[key] = candidate;
    };
    for (const game of x01Games) {
        const base = { gameId: String(game._id), date: finishedAt(game) };
        for (const playerId of game.players ?? []) {
            const playerModel = model(game, playerId);
            const player = String(playerId);
            for (const checkout of Object.keys(playerModel.checkoutScores?.game ?? {}).map(Number).filter(Boolean)) {
                better('highestCheckout', { ...base, player, value: checkout });
            }
            const count180 = playerModel.scoreRanges?.game?.['180'] ?? 0;
            if (count180 > 0) better('most180sInGame', { ...base, player, value: count180 });
            const average = playerModel.averages?.game?.overall ?? 0;
            if (average > 0 && (playerModel.totalThrow?.game?.rounds ?? 0) >= 3) better('bestGameAverage', { ...base, player, value: round(average, 1) });
        }
        for (const leg of legsInOrder(game)) {
            const finish = leg.find(visit => Number(visit?.scoreLeft) === 0);
            if (!finish || startingScoreOf(game, finish.playerId) !== 501) continue;
            const darts = leg.filter(visit => visit?.playerId === finish.playerId)
                .reduce((sum, visit) => sum + thrownDarts(visit.darts).length, 0);
            if (darts > 0) better('bestLeg', { ...base, player: String(finish.playerId), value: darts }, true);
        }
    }
    return records;
};

/**
 * When games were played: start time and type of every game, and for finished
 * X01 games the points and rounds behind the club average of that game.
 */
export const gameLog = (allGames) => allGames.map(({ type, game }) => {
    const entry = { at: game.createdAt, type, finished: Boolean(game.hasWinner) };
    if (type === 'x01' && game.hasWinner) {
        let points = 0, rounds = 0;
        for (const playerId of game.players ?? []) {
            const playerModel = model(game, playerId);
            const playerRounds = playerModel.totalThrow?.game?.rounds ?? 0;
            points += (playerModel.averages?.game?.overall ?? 0) * playerRounds;
            rounds += playerRounds;
        }
        if (rounds) Object.assign(entry, { points: round(points, 1), rounds });
    }
    return entry;
});
