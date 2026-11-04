// the club rating for the mock API: made-up games of the last months, worked out by the API's own maths
import { clubRatings, matchChances, ratingBoard, ratingFactsOf, ratingHistory } from '../../../app-api/src/utils/compare.js';

const DAY = 864e5;
let cached = null;

/**
 * The ratings of the players from 120 games over the last 200 days: the
 * second player the strongest, then the first, the third and so on (the
 * stronger wins three games of four), the sixth with two games only, still
 * settling. → { ratings (with each player's points), board }
 */
export const mockRatings = (ids) => {
    const key = ids.join(',');
    if (cached?.key === key) return cached;
    const order = [ids[1], ids[0], ids[2], ids[3], ids[4]].filter(Boolean);
    const now = Date.now();
    const tallies = [];
    // every pair in turn
    const pairs = order.flatMap((a, index) => order.slice(index + 1).map(b => [a, b]));
    for (let i = 0; pairs.length && i < 120; i += 1) {
        const [stronger, weaker] = pairs[i % pairs.length];
        const [a, b] = i % 2 ? [stronger, weaker] : [weaker, stronger];
        const winner = i % 4 === 3 ? weaker : stronger;
        tallies.push({ at: new Date(now - (200 - i * 1.6) * DAY), sourceId: `rg${i}`, players: [a, b], winners: [winner], friendly: false });
    }
    if (ids[5]) {
        tallies.push({ at: new Date(now - 10 * DAY), sourceId: 'rn1', players: [ids[5], ids[3]], winners: [ids[5]] });
        tallies.push({ at: new Date(now - 3 * DAY), sourceId: 'rn2', players: [ids[5], ids[4]], winners: [ids[4]] });
    }
    const ratings = clubRatings(tallies, { history: true });
    cached = { key, ratings, board: ratingBoard(ratings, ids) };
    return cached;
};

// a player's rating as GET /api/stats/player/:id gives it
export const mockRatingFacts = (ids, playerId) => {
    const { ratings, board } = mockRatings(ids);
    return ratingFactsOf(ratings, board, playerId);
};

// GET /api/stats/player/:id/rating
export const mockRatingHistory = (players, playerId) => {
    const { ratings } = mockRatings(players.map(p => p.id));
    const points = ratings.get(playerId)?.points ?? [];
    const nickname = (id) => players.find(p => p.id === id)?.nickname ?? null;
    return {
        history: ratingHistory(points),
        lastChanges: points.slice(-10).reverse().map(({ at, change, sourceId, opponents }) => ({ at, change, sourceId, opponents: opponents.map(id => ({ id, nickname: nickname(id) })) })),
    };
};

// the chances on the open matches of a tournament or league
export const withMockChances = (matches, ids) => matchChances(matches, mockRatings(ids).ratings);
