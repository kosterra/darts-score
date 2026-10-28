import db from '../models/db.model.js';
import { viewOf } from './game.view.js';
import { x01Kpis } from './kpi.data.js';
import { getBadge } from './badges.js';

/**
 * "Your year in darts": what a player did in one calendar year, in all their
 * clubs, for the look back each December (and any year after it). Only
 * finished games count; friendly ones too, as they were played.
 */

const GAME_TYPES = [
    { kind: 'x01', model: () => db.x01 },
    { kind: 'cricket', model: () => db.cricket },
    { kind: 'elimination', model: () => db.elimination },
    { kind: 'clock', model: () => db.clock },
    { kind: 'rules', model: () => db.rulesGame },
];
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

// the year as instants: from its first day to the first of the next, in UTC (a game at midnight on New Year's Eve may fall either side)
export const yearSpan = (year) => ({ from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year + 1, 0, 1)) });

// the years with a look back: from the first finished game to this one
export const reviewYears = (firstGameAt, now = new Date()) => {
    if (!firstGameAt) return [];
    const first = new Date(firstGameAt).getUTCFullYear();
    return Array.from({ length: now.getUTCFullYear() - first + 1 }, (_, index) => now.getUTCFullYear() - index);
};

/**
 * The look back of a player at a year: { year, games, x01, days, busiestMonth,
 * opponent, trainings, badges } — counts, records and the rival most played.
 */
export const yearReview = async (playerId, year) => {
    const id = String(playerId);
    const { from, to } = yearSpan(year);
    const where = { players: id, gameIsRunning: false, hasWinner: true, createdAt: { $gte: from, $lt: to } };
    const found = await Promise.all(GAME_TYPES.map(type => type.model().find(where).lean()
        .then(list => list.map(game => ({ ...viewOf(type.kind === 'rules' ? game.kind : type.kind, game), kind: type.kind === 'rules' ? game.kind : type.kind, createdAt: game.createdAt, _id: game._id })))));
    const games = found.flat().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const won = (game) => game.playerModels?.[id]?.hasWonGame === true;

    // the games per type, the wins
    const byType = {};
    for (const game of games) byType[game.kind] = (byType[game.kind] ?? 0) + 1;
    const together = games.filter(game => (game.players ?? []).length > 1);
    const wins = together.filter(won).length;

    // X01: the average over all darts, the best game, the 180s and the highest checkout
    const x01 = games.filter(game => game.kind === 'x01');
    let points = 0;
    let darts = 0;
    let oneEighties = 0;
    let highestCheckout = 0;
    let bestGame = null;
    for (const game of x01) {
        const model = game.playerModels?.[id] ?? {};
        const thrown = model.totalThrow?.game?.darts ?? 0;
        const average = model.averages?.game?.overall ?? 0;
        darts += thrown;
        points += average * thrown / 3;
        oneEighties += model.scoreRanges?.game?.['180'] ?? 0;
        highestCheckout = Math.max(highestCheckout, ...Object.keys(model.checkoutScores?.game ?? {}).map(Number).filter(Number.isFinite), 0);
        if (thrown >= 9 && (!bestGame || average > bestGame.average)) bestGame = { average: round(average, 2), game: String(game._id), at: game.createdAt };
    }
    const kpis = x01.length ? x01Kpis(x01, id) : null;

    // the days with a game, the month with the most
    const days = new Set(games.map(game => new Date(game.createdAt).toISOString().slice(0, 10)));
    const months = Array(12).fill(0);
    for (const game of games) months[new Date(game.createdAt).getUTCMonth()] += 1;
    const busiest = months.indexOf(Math.max(...months));

    // the rival: the one played most against, and how it went
    const rivals = new Map();
    for (const game of together) {
        for (const other of (game.players ?? []).map(String).filter(entry => entry !== id)) {
            const entry = rivals.get(other) ?? { player: other, games: 0, wins: 0 };
            entry.games += 1;
            if (won(game)) entry.wins += 1;
            rivals.set(other, entry);
        }
    }
    const rival = [...rivals.values()].sort((a, b) => b.games - a.games || b.wins - a.wins)[0] ?? null;
    const rivalPlayer = rival ? await db.player.findById(rival.player, 'nickname').lean() : null;

    // the trainings, the badges earned in the year
    const trainingWhere = { createdAt: { $gte: from, $lt: to } };
    const [atc, bot, rules, player] = await Promise.all([
        db.atc.countDocuments({ ...trainingWhere, 'player.id': id }),
        db.x01Training.countDocuments({ ...trainingWhere, players: id }),
        db.rulesTraining.countDocuments({ ...trainingWhere, 'player.id': id }),
        db.player.findById(id, 'nickname badges').lean(),
    ]);
    const badges = (player?.badges ?? []).filter(badge => getBadge(badge.badge) && badge.earnedAt >= from && badge.earnedAt < to)
        .sort((a, b) => new Date(a.earnedAt) - new Date(b.earnedAt));

    return {
        year,
        player: { id, nickname: player?.nickname ?? '?' },
        games: { total: games.length, together: together.length, wins, winRate: together.length ? Math.round(wins / together.length * 100) : 0, byType },
        x01: x01.length ? {
            games: x01.length,
            average: darts ? round(points / darts * 3, 2) : null,
            bestGame,
            darts,
            oneEighties,
            tonPlus: kpis.tonPlus,
            highestCheckout: highestCheckout || null,
            bestLeg: kpis.bestLeg || null,
        } : null,
        days: days.size,
        busiestMonth: games.length ? { month: busiest + 1, games: months[busiest] } : null,
        firstGameAt: games[0]?.createdAt ?? null,
        opponent: rival ? { id: rival.player, nickname: rivalPlayer?.nickname ?? '?', games: rival.games, wins: rival.wins } : null,
        trainings: atc + bot + rules,
        badges: { count: badges.length, latest: badges.slice(-3).reverse().map(badge => {
            const { id, group, title, description, tier, tiers } = getBadge(badge.badge);
            return { id, group, title, description, tier, tiers, earnedAt: badge.earnedAt };
        }) },
    };
};
