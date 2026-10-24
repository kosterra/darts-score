import { gameOf } from '../rules/games.js';
import { replayGame } from '../rules/engine.js';
import { wonInDecidingLeg } from './badges.js';

/**
 * The player comparison: how two or more players did against each other (the
 * duel), what their duels showed, and the club's rating with the chances for
 * the next game.
 */

const time = (game) => new Date(game.updatedAt ?? game.createdAt ?? 0).getTime();
const won = (game, playerId) => game.playerModels?.[playerId]?.hasWonGame === true;
const round = (value, decimals = 1) => (Number.isFinite(value) ? Math.round(value * 10 ** decimals) / 10 ** decimals : null);

/**
 * The record of the selected players in their games: per player the wins
 * (and for X01 the legs and sets, and the matches won in the deciding leg),
 * the current streak, the last ten results, and who beats whom pair by pair.
 * games: finished games of one type (for X01 as views, with their legs);
 * playerIds: the selected players.
 * → { wins, legs, sets, decidingWins, streak: { playerId, count } | null,
 *     last: [{ id, at, winner }], pairs: { [a]: { [b]: wins of a in games with b } } }
 */
export const duelRecord = (games, playerIds, { type = null } = {}) => {
    const ids = playerIds.map(String);
    const zero = () => Object.fromEntries(ids.map(id => [id, 0]));
    const wins = zero();
    const legs = zero();
    const sets = zero();
    const decidingWins = zero();
    const pairs = Object.fromEntries(ids.map(a => [a, Object.fromEntries(ids.filter(b => b !== a).map(b => [b, 0]))]));
    const newestFirst = [...games].sort((a, b) => time(b) - time(a));

    for (const game of newestFirst) {
        const players = (game.players ?? []).map(String);
        for (const id of ids) {
            if (!players.includes(id)) continue;
            const model = game.playerModels?.[id] ?? {};
            if (won(game, id)) {
                wins[id] += 1;
                for (const other of ids) if (other !== id && players.includes(other)) pairs[id][other] += 1;
                if (type === 'x01' && wonInDecidingLeg(game, id)) decidingWins[id] += 1;
            }
            if (type === 'x01') {
                legs[id] += Number(model.legsWon?.game ?? 0) || 0;
                sets[id] += Number(model.setsWon ?? 0) || 0;
            }
        }
    }

    // the winner among the selected players, or null (someone else won, or nobody)
    const winnerOf = (game) => ids.find(id => won(game, id)) ?? null;
    const last = newestFirst.slice(0, 10).map(game => ({ id: String(game._id ?? game.id), at: game.updatedAt ?? game.createdAt, winner: winnerOf(game) }));
    let streak = null;
    for (const game of newestFirst) {
        const winner = winnerOf(game);
        if (!winner) break;
        if (!streak) streak = { playerId: winner, count: 1 };
        else if (streak.playerId === winner) streak.count += 1;
        else break;
    }

    return { wins, legs, sets, decidingWins, streak, last, pairs };
};

/**
 * What the games of one of the newer kinds (Shanghai, Killer, Halve-It, Golf,
 * Tactics) show for a player, worked out from their visits by the app's rules.
 * Only games played to their end count.
 */
export const rulesFigures = (kind, games, playerId) => {
    const definition = gameOf(kind);
    if (!definition) return {};
    const states = [];
    for (const game of games) {
        try {
            const replayed = replayGame(definition, game);
            const state = replayed.state.players?.[playerId];
            if (state && replayed.over) states.push(state);
        } catch {
            // a game the rules cannot replay is left out
        }
    }
    const count = states.length;
    const sum = (pick) => states.reduce((total, state) => total + (Number(pick(state)) || 0), 0);
    const perGame = (pick) => (count ? round(sum(pick) / count) : null);
    switch (kind) {
        case 'shanghai': return {
            pointsPerGame: perGame(state => state.points),
            hitRate: sum(state => state.darts) ? round(sum(state => state.hits) / sum(state => state.darts) * 100) : null,
            shanghais: states.filter(state => state.shanghai).length,
        };
        case 'killer': return {
            livesTaken: sum(state => state.kills),
            livesTakenPerGame: perGame(state => state.kills),
            survived: states.filter(state => state.lives > 0).length,
        };
        case 'halveit': return {
            pointsPerGame: perGame(state => state.points),
            halvedPerGame: perGame(state => state.halved),
            bestRound: count ? Math.max(...states.map(state => state.best ?? 0)) : null,
        };
        case 'golf': {
            const holes = sum(state => state.holes.length);
            return {
                strokesPerHole: holes ? round(sum(state => state.strokes) / holes, 2) : null,
                holesInOne: sum(state => state.holes.filter(strokes => strokes === 1).length),
                bestRound: count ? Math.min(...states.map(state => state.strokes)) : null,
            };
        }
        case 'tactics': return {
            pointsPerGame: perGame(state => state.points),
            marksPerRound: sum(state => state.darts) ? round(sum(state => state.totalMarks) / sum(state => state.darts) * 3, 2) : null,
            closedPerGame: perGame(state => Object.values(state.marks ?? {}).filter(marks => marks >= 3).length),
        };
        default: return {};
    }
};

/**
 * The best moments of each player in the X01 games of the duel: the best
 * game average and the highest checkout (each with its game), and the 180s.
 * games: views of the X01 games.
 */
export const x01Highlights = (games, playerIds) => Object.fromEntries(playerIds.map(String).map(playerId => {
    let bestAverage = null;
    let highestCheckout = null;
    let num180s = 0;
    for (const game of games) {
        const model = game.playerModels?.[playerId];
        if (!model) continue;
        const id = String(game._id ?? game.id);
        const at = game.updatedAt ?? game.createdAt;
        const average = Number(model.averages?.game?.overall ?? 0);
        if (average > 0 && (!bestAverage || average > bestAverage.value)) bestAverage = { value: round(average, 2), gameId: id, at };
        for (const [score, times] of Object.entries(model.checkoutScores?.game ?? {})) {
            if (Number(times) > 0 && (!highestCheckout || Number(score) > highestCheckout.value)) highestCheckout = { value: Number(score), gameId: id, at };
        }
        num180s += Number(model.scoreRanges?.game?.['180'] ?? 0) || 0;
    }
    return [playerId, { bestAverage, highestCheckout, num180s }];
}));

// the club's rating: everyone starts here, a win against an equal moves it by K / 2
export const RATING_START = 1000;
const RATING_K = 24;
// below this many rated games a rating is provisional
export const RATING_MIN_GAMES = 5;

/**
 * An Elo rating per player of the club, from its finished games in order:
 * the winner of a game beats each other player of it (the change split among
 * them), friendly games and games without exactly one winner are left out.
 * tallies: [{ at, players, winners, friendly }] (the club's game tallies)
 * → Map(playerId → { rating, games })
 */
export const clubRatings = (tallies) => {
    const ratings = new Map();
    const of = (id) => ratings.get(id) ?? { rating: RATING_START, games: 0 };
    for (const tally of [...tallies].sort((a, b) => new Date(a.at) - new Date(b.at))) {
        const players = [...new Set((tally.players ?? []).map(String))];
        const winners = (tally.winners ?? []).map(String);
        if (tally.friendly || players.length < 2 || winners.length !== 1 || !players.includes(winners[0])) continue;
        const winner = winners[0];
        const losers = players.filter(id => id !== winner);
        const k = RATING_K / losers.length;
        const before = new Map(players.map(id => [id, of(id).rating]));
        let gained = 0;
        for (const loser of losers) {
            const expected = 1 / (1 + 10 ** ((before.get(loser) - before.get(winner)) / 400));
            const change = k * (1 - expected);
            gained += change;
            ratings.set(loser, { rating: of(loser).rating - change, games: of(loser).games + 1 });
        }
        ratings.set(winner, { rating: of(winner).rating + gained, games: of(winner).games + 1 });
    }
    return new Map([...ratings].map(([id, entry]) => [id, { rating: Math.round(entry.rating), games: entry.games }]));
};

/**
 * The chance of each player to win the next game against the others, from
 * their ratings, in percent (adding up to 100).
 */
export const winChances = (ratings, playerIds) => {
    const strength = playerIds.map(id => 10 ** ((ratings.get(String(id))?.rating ?? RATING_START) / 400));
    const total = strength.reduce((sum, value) => sum + value, 0);
    const shares = strength.map(value => Math.round(value / total * 100));
    // rounded shares still add up to 100: the rest goes to the biggest
    const rest = 100 - shares.reduce((sum, value) => sum + value, 0);
    if (rest) shares[shares.indexOf(Math.max(...shares))] += rest;
    return Object.fromEntries(playerIds.map((id, index) => [String(id), shares[index]]));
};

/**
 * Who a player played most often in the club: [{ playerId, games }], most first.
 */
export const opponentsOf = (tallies, playerId, count = 5) => {
    const id = String(playerId);
    const counts = new Map();
    for (const tally of tallies) {
        const players = (tally.players ?? []).map(String);
        if (!players.includes(id)) continue;
        for (const other of new Set(players)) if (other !== id) counts.set(other, (counts.get(other) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, count).map(([other, games]) => ({ playerId: other, games }));
};
