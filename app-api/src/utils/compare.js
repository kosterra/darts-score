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
// partners of doubles, by the teams kept with a tally: they played together, not against each other
const partners = (tally, a, b) => (tally.teams ?? []).some(team => team.includes(a) && team.includes(b));
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
// the first rated games move a rating faster, so a new player soon finds their place
const RATING_K_SETTLING = 48;
// below this many rated games a rating is provisional
export const RATING_MIN_GAMES = 5;
// what the club rating needs of a tally
export const RATING_FIELDS = 'at sourceId players winners friendly teams';

const kOf = (entry) => (entry.games < RATING_MIN_GAMES ? RATING_K_SETTLING : RATING_K);
const expectedScore = (rating, against) => 1 / (1 + 10 ** ((against - rating) / 400));

/**
 * The sides of a rated game, the winning one first: [[ids], …]; null for a
 * game the rating leaves out (friendly, fewer than two sides, no single
 * winning side, or partners missing).
 */
const ratedSides = (tally) => {
    const players = [...new Set((tally.players ?? []).map(String))];
    const winners = [...new Set((tally.winners ?? []).map(String))];
    if (tally.friendly || players.length < 2 || !winners.length || !winners.every(id => players.includes(id))) return null;
    // doubles: the teams; otherwise each player alone
    const sides = tally.teams?.length
        ? tally.teams.map(team => [...new Set(team.map(String))])
        : players.map(id => [id]);
    const covered = sides.flat();
    if (sides.length < 2 || sides.some(side => !side.length) || covered.length !== players.length || !players.every(id => covered.includes(id))) return null;
    const winning = sides.filter(side => side.length === winners.length && side.every(id => winners.includes(id)));
    if (winning.length !== 1) return null;
    return [winning[0], ...sides.filter(side => side !== winning[0])];
};

/**
 * An Elo rating per player of the club, from its finished games in order
 * (by when they ended, the game's id breaking a tie): the winner of a game
 * beats each other player of it, the change split among them; a player's
 * first RATING_MIN_GAMES games count double (K 48, then 24), each side with
 * its own K. In doubles a team plays with the mean of its partners and each
 * partner takes half of the team's change. Friendly games and games without
 * one winning side are left out.
 * tallies: [{ at, sourceId, players, winners, friendly, teams }] (see ratingTallies)
 * history: also each player's points, [{ at, rating, change, sourceId, opponents }]
 * → Map(playerId → { rating, games, best, lastAt, points? }); best is the
 *   highest rating since it settled (null before), lastAt the latest game
 */
export const clubRatings = (tallies, { history = false } = {}) => {
    const ratings = new Map();
    const of = (id) => ratings.get(id) ?? { rating: RATING_START, games: 0, best: null, points: [] };
    const ordered = [...tallies].sort((a, b) => new Date(a.at) - new Date(b.at) || String(a.sourceId ?? '').localeCompare(String(b.sourceId ?? '')));
    for (const tally of ordered) {
        const sides = ratedSides(tally);
        if (!sides) continue;
        const [winner, ...losers] = sides;
        const strength = (side) => side.reduce((sum, id) => sum + of(id).rating, 0) / side.length;
        const before = sides.map(strength);
        const changes = new Map();
        const add = (id, change) => changes.set(id, (changes.get(id) ?? 0) + change);
        losers.forEach((side, index) => {
            // the share of the game against this side: what the winner was not expected to take
            const share = (1 - expectedScore(before[0], before[index + 1])) / losers.length;
            for (const id of winner) add(id, kOf(of(id)) / winner.length * share);
            for (const id of side) add(id, -kOf(of(id)) / side.length * share);
        });
        for (const [id, change] of changes) {
            const entry = of(id);
            const rating = entry.rating + change;
            const games = entry.games + 1;
            const best = games >= RATING_MIN_GAMES ? Math.max(entry.best ?? -Infinity, rating) : entry.best;
            if (history) {
                entry.points.push({ at: tally.at, rating, change, sourceId: tally.sourceId ?? null, opponents: sides.filter(side => !side.includes(id)).flat() });
            }
            ratings.set(id, { rating, games, best, lastAt: tally.at, points: entry.points });
        }
    }
    return new Map([...ratings].map(([id, entry]) => [id, {
        rating: Math.round(entry.rating),
        games: entry.games,
        best: entry.best === null ? null : Math.round(entry.best),
        lastAt: entry.lastAt,
        ...(history && { points: entry.points.map(point => ({ ...point, rating: Math.round(point.rating), change: Math.round(point.change * 10) / 10 })) }),
    }]));
};

/**
 * A player's rating over time for a chart: the last rating of each day, and
 * of a long history only every so many days (always the latest), at most
 * maxPoints. points: [{ at, rating }] in order (see clubRatings).
 * → [{ at, rating }]
 */
export const ratingHistory = (points, { maxPoints = 120 } = {}) => {
    const byDay = new Map();
    for (const point of points) byDay.set(new Date(point.at).toISOString().slice(0, 10), { at: point.at, rating: point.rating });
    const days = [...byDay.values()];
    if (days.length <= maxPoints) return days;
    const step = (days.length - 1) / (maxPoints - 1);
    return Array.from({ length: maxPoints }, (_, index) => days[Math.round(index * step)]);
};

/**
 * One tally per game: a game of a shared tournament has a tally per club that
 * took part, each with only that club's players, so they are joined again
 * (players and winners together) for the rating to see the whole game.
 */
export const mergeTallies = (tallies) => {
    const bySource = new Map();
    const loose = [];
    for (const tally of tallies) {
        if (!tally.sourceId) { loose.push(tally); continue; }
        const key = String(tally.sourceId);
        const seen = bySource.get(key);
        if (!seen) { bySource.set(key, { ...tally, sourceId: key }); continue; }
        const union = (a = [], b = []) => [...new Set([...a, ...b].map(String))];
        bySource.set(key, {
            ...seen,
            at: new Date(tally.at) < new Date(seen.at) ? tally.at : seen.at,
            players: union(seen.players, tally.players),
            winners: union(seen.winners, tally.winners),
            friendly: Boolean(seen.friendly || tally.friendly),
            teams: seen.teams?.length ? seen.teams : tally.teams,
        });
    }
    return [...bySource.values(), ...loose];
};

/**
 * The tallies the club rating of these clubs is worked out from: their own,
 * and for the games of a shared tournament they took part in the other
 * clubs' tallies of the same games, joined by game (see mergeTallies).
 */
export const ratingTallies = async (clubIds) => {
    const db = (await import('../models/db.model.js')).default;
    const ids = [...new Set([clubIds].flat().map(String))];
    const own = await db.clubTally.find({ club: { $in: ids } }, RATING_FIELDS).lean();
    const shared = await db.tournament.find(
        { $or: [{ club: { $in: ids } }, { invitedClubs: { $in: ids } }], 'invitedClubs.0': { $exists: true } },
        'club invitedClubs matches.game',
    ).lean();
    const games = [...new Set(shared.flatMap(tournament => (tournament.matches ?? []).map(match => match.game).filter(Boolean).map(String)))];
    const others = [...new Set(shared.flatMap(tournament => [tournament.club, ...(tournament.invitedClubs ?? [])].map(String)))].filter(id => !ids.includes(id));
    const theirs = games.length && others.length
        ? await db.clubTally.find({ club: { $in: others }, sourceId: { $in: games } }, RATING_FIELDS).lean()
        : [];
    return mergeTallies([...own, ...theirs]);
};

// a rating is on the club's board while its player played a rated game within this many days
export const RATING_ACTIVE_DAYS = 365;

/**
 * The club's board of the rating: its members (guests left out) whose rating
 * has settled and who played within RATING_ACTIVE_DAYS, strongest first.
 * → [{ player, value, games }]
 */
export const ratingBoard = (ratings, memberIds, { now = new Date() } = {}) => {
    const members = new Set([...memberIds].map(String));
    const since = now.getTime() - RATING_ACTIVE_DAYS * 24 * 60 * 60 * 1000;
    return [...ratings]
        .filter(([id, entry]) => members.has(id) && entry.games >= RATING_MIN_GAMES && new Date(entry.lastAt).getTime() >= since)
        .map(([player, entry]) => ({ player, value: entry.rating, games: entry.games }))
        .sort((a, b) => b.value - a.value || b.games - a.games || a.player.localeCompare(b.player));
};

/**
 * What a player's page shows of the club rating: the rating, its games,
 * whether it is still provisional, the place on the club's board (null when
 * not on it) of how many, and the best rating so far.
 */
export const ratingFactsOf = (ratings, board, playerId) => {
    const entry = ratings.get(String(playerId)) ?? { rating: RATING_START, games: 0, best: null };
    const place = board.findIndex(row => row.player === String(playerId));
    return {
        rating: entry.rating,
        games: entry.games,
        provisional: entry.games < RATING_MIN_GAMES,
        rank: place < 0 ? null : place + 1,
        of: board.length,
        best: entry.best,
    };
};

/**
 * The club's ratings (see ratingTallies) with its board, for the dashboard,
 * a player's page and the rating notices. history: with each player's points.
 */
export const clubRatingBoard = async (clubId, { history = false } = {}) => {
    const db = (await import('../models/db.model.js')).default;
    const [tallies, members] = await Promise.all([
        ratingTallies(clubId),
        db.player.find({ clubs: clubId, guest: { $ne: true } }, '_id').lean(),
    ]);
    const ratings = clubRatings(tallies, { history });
    return { ratings, board: ratingBoard(ratings, members.map(member => String(member._id))) };
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

// a match still to be played between two players
const isOpenMatch = (match) => ['ready', 'running'].includes(match.status) && (match.players ?? []).filter(Boolean).length === 2;

/**
 * The matches of a tournament or league, each one still to be played with
 * both players known with their chances to win it: { [playerId]: percent }.
 */
export const matchChances = (matches, ratings) => (matches ?? []).map(match => (isOpenMatch(match)
    ? { ...match, chances: winChances(ratings, match.players) }
    : match));

/**
 * A tournament or league view with the chances on its open matches, from the
 * rating of these clubs (a shared tournament: every club taking part).
 */
export const withChances = async (view, clubIds) => {
    if (!(view.matches ?? []).some(isOpenMatch)) return view;
    const ratings = clubRatings(await ratingTallies(clubIds));
    return { ...view, matches: matchChances(view.matches, ratings) };
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
        for (const other of new Set(players)) if (other !== id && !partners(tally, id, other)) counts.set(other, (counts.get(other) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, count).map(([other, games]) => ({ playerId: other, games }));
};

// a record says something about the best and the toughest opponent from this many games on
export const RIVAL_MIN_GAMES = 3;

/**
 * A player's opponents in the club, from the club's games: per opponent the
 * games together, the player's wins and the opponent's, and the game type they
 * play most; and of them the one played most and least, the best record and
 * the toughest (both from RIVAL_MIN_GAMES games on; a tie on the share goes to
 * the one with more games).
 * tallies: [{ players, winners, sourceType }]
 * → { opponents: [{ playerId, games, wins, losses, type }], mostPlayed, leastPlayed, best, worst }
 */
export const rivalsOf = (tallies, playerId, { minGames = RIVAL_MIN_GAMES } = {}) => {
    const id = String(playerId);
    const byOpponent = new Map();
    for (const tally of tallies) {
        const players = [...new Set((tally.players ?? []).map(String))];
        if (!players.includes(id)) continue;
        const winners = (tally.winners ?? []).map(String);
        for (const other of players) {
            if (other === id || partners(tally, id, other)) continue;
            const entry = byOpponent.get(other) ?? { playerId: other, games: 0, wins: 0, losses: 0, types: new Map() };
            entry.games += 1;
            if (winners.includes(id)) entry.wins += 1;
            if (winners.includes(other)) entry.losses += 1;
            entry.types.set(tally.sourceType, (entry.types.get(tally.sourceType) ?? 0) + 1);
            byOpponent.set(other, entry);
        }
    }
    const opponents = [...byOpponent.values()].map(({ types, ...entry }) => ({
        ...entry,
        type: [...types].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }));
    const share = (entry) => (entry.wins + entry.losses ? entry.wins / (entry.wins + entry.losses) : 0.5);
    const byGames = [...opponents].sort((a, b) => b.games - a.games);
    const counted = opponents.filter(entry => entry.games >= minGames && entry.wins + entry.losses > 0);
    const best = [...counted].sort((a, b) => share(b) - share(a) || b.games - a.games)[0] ?? null;
    const worst = [...counted].sort((a, b) => share(a) - share(b) || b.games - a.games)[0] ?? null;
    return {
        opponents: byGames,
        mostPlayed: byGames[0] ?? null,
        leastPlayed: byGames.length > 1 ? byGames.at(-1) : null,
        best,
        // the toughest only when it is someone else than the best
        worst: worst && worst.playerId !== best?.playerId ? worst : null,
    };
};
