import { describe, it, expect } from 'vitest';
import { RATING_MIN_GAMES, RATING_START, clubRatings, duelRecord, matchChances, mergeTallies, opponentsOf, ratingBoard, ratingFactsOf, ratingHistory, rulesFigures, winChances, x01Highlights } from './compare.js';

const A = 'a';
const B = 'b';
const C = 'c';
let minute = 0;
const at = () => new Date(Date.UTC(2026, 0, 5, 18, minute++));
const game = (winner, players = [A, B], extra = {}) => ({
    _id: `g${minute}`, updatedAt: at(), players,
    playerModels: Object.fromEntries(players.map(id => [id, { hasWonGame: id === winner, ...(extra[id] ?? {}) }])),
});

describe('duel record', () => {
    it('counts the wins, the streak from the latest and the last results', () => {
        const games = [game(A), game(B), game(B), game(B)];
        const record = duelRecord(games, [A, B]);
        expect(record.wins).toEqual({ a: 1, b: 3 });
        expect(record.streak).toEqual({ playerId: B, count: 3 });
        expect(record.last[0].winner).toBe(B);
        expect(record.last).toHaveLength(4);
    });

    it('a game someone else won ends the streak, and who beats whom counts pair by pair', () => {
        const games = [game(A, [A, B, C]), game(C, [A, B, C]), game(B, [A, B])];
        const record = duelRecord(games, [A, B]);
        expect(record.streak).toEqual({ playerId: B, count: 1 });
        expect(record.pairs).toEqual({ a: { b: 1 }, b: { a: 1 } });
    });

    it('X01: the legs and sets won', () => {
        const games = [game(A, [A, B], { a: { legsWon: { game: 3 }, setsWon: 1 }, b: { legsWon: { game: 2 }, setsWon: 0 } })];
        const record = duelRecord(games, [A, B], { type: 'x01' });
        expect(record.legs).toEqual({ a: 3, b: 2 });
        expect(record.sets).toEqual({ a: 1, b: 0 });
    });
});

describe('the newer games', () => {
    it('Golf: strokes per hole and holes in one, from the visits', () => {
        const holes = Array.from({ length: 9 }, (_, index) => index + 1);
        const golf = { players: [A], settings: { holes: 9 }, visits: holes.map(hole => ({ player: A, darts: [hole === 1 ? 'D1' : `S${hole}`] })) };
        expect(rulesFigures('golf', [golf], A)).toEqual({ strokesPerHole: 2.78, holesInOne: 1, bestRound: 25 });
    });

    it('Killer: the lives taken', () => {
        const killer = { players: [A, B], settings: { lives: 3, numbers: { a: 1, b: 2 } }, visits: [{ player: A, darts: ['D1', 'D2', 'D2'] }, { player: B, darts: ['0', '0', '0'] }, { player: A, darts: ['D2'] }] };
        expect(rulesFigures('killer', [killer], A)).toMatchObject({ livesTaken: 3, survived: 1 });
    });
});

describe('highlights', () => {
    it('the best game average and the highest checkout, with their game', () => {
        const games = [
            game(A, [A, B], { a: { averages: { game: { overall: 55.3 } }, checkoutScores: { game: { 80: 1 } }, scoreRanges: { game: { 180: 1 } } } }),
            game(A, [A, B], { a: { averages: { game: { overall: 61.25 } }, checkoutScores: { game: { 121: 1, 40: 2 } }, scoreRanges: { game: { 180: 2 } } } }),
        ];
        const { a } = x01Highlights(games, [A, B]);
        expect(a.bestAverage).toMatchObject({ value: 61.25, gameId: games[1]._id });
        expect(a.highestCheckout).toMatchObject({ value: 121, gameId: games[1]._id });
        expect(a.num180s).toBe(3);
    });
});

describe('club rating', () => {
    const tally = (winner, players = [A, B], friendly = false) => ({ at: at(), players, winners: winner ? [winner] : [], friendly });

    it('the winner gains what the losers lose; friendly games and games without one winner do not count', () => {
        const ratings = clubRatings([tally(A), tally(A), tally(B, [A, B], true), tally(null)]);
        expect(ratings.get(A).rating).toBeGreaterThan(RATING_START);
        expect(ratings.get(A).rating + ratings.get(B).rating).toBe(2 * RATING_START);
        expect(ratings.get(A).games).toBe(2);
    });

    it('a first game between new players moves each by 24 (K 48), then by K 24 once settled', () => {
        const first = clubRatings([tally(A)]);
        expect(first.get(A)).toMatchObject({ rating: 1024, games: 1 });
        expect(first.get(B)).toMatchObject({ rating: 976, games: 1 });
        // two equal players who won RATING_MIN_GAMES each: settled at 1000 or near, the next win moves by about 12
        const settled = Array.from({ length: 2 * RATING_MIN_GAMES }, (_, index) => tally(index % 2 ? A : B));
        const before = clubRatings(settled);
        const after = clubRatings([...settled, tally(A)], { history: true });
        const change = after.get(A).points.at(-1).change;
        expect(change).toBeGreaterThan(10);
        expect(change).toBeLessThan(14);
        expect(after.get(A).rating - before.get(A).rating).toBeCloseTo(change, 0);
    });

    it('each side its own K: a newcomer beating a settled player gains twice what the other loses', () => {
        const settled = Array.from({ length: 2 * RATING_MIN_GAMES }, (_, index) => tally(index % 2 ? A : B));
        const ratings = clubRatings([...settled, tally(C, [A, C])], { history: true });
        const gained = ratings.get(C).points[0].change;
        const lost = ratings.get(A).points.at(-1).change;
        expect(gained).toBeGreaterThan(0);
        expect(gained / -lost).toBeCloseTo(2, 1);
    });

    it('three players: the winner beats each, the change split among them', () => {
        const ratings = clubRatings([tally(A, [A, B, C])]);
        expect(ratings.get(A).rating).toBe(1024);
        expect(ratings.get(B).rating).toBe(988);
        expect(ratings.get(C).rating).toBe(988);
    });

    it('doubles: the team plays with the mean of its partners, each partner takes half of the change', () => {
        const doubles = { at: at(), players: [A, B, C, 'd'], winners: [A, C], teams: [[A, C], [B, 'd']] };
        const ratings = clubRatings([doubles]);
        expect([A, C].map(id => ratings.get(id).rating)).toEqual([1012, 1012]);
        expect([B, 'd'].map(id => ratings.get(id).rating)).toEqual([988, 988]);
        expect(ratings.get(A).games).toBe(1);
        // a stronger partner does not lift the weaker one's change: both of the team move the same
        const strong = Array.from({ length: 3 }, () => tally(A, [A, 'e']));
        const after = clubRatings([...strong, { ...doubles, at: at() }]);
        expect(after.get(A).rating - clubRatings(strong).get(A).rating).toBe(after.get(C).rating - RATING_START);
        // a team that is not the winners, or partners missing from the players, leave the game out
        expect(clubRatings([{ ...doubles, winners: [A, B] }]).size).toBe(0);
        expect(clubRatings([{ ...doubles, teams: [[A, C], [B, 'x']] }]).size).toBe(0);
    });

    it('games ending at the same moment count in the order of their ids, whatever order they come in', () => {
        const moment = at();
        const one = { at: moment, sourceId: 'g1', players: [A, B], winners: [B] };
        const two = { at: moment, sourceId: 'g2', players: [A, B], winners: [A] };
        const forward = clubRatings([one, two], { history: true });
        const backward = clubRatings([two, one], { history: true });
        expect(backward.get(A)).toEqual(forward.get(A));
        expect(forward.get(A).points.map(point => point.sourceId)).toEqual(['g1', 'g2']);
    });

    it('the best rating only once settled; the points name the opponents', () => {
        const ratings = clubRatings(Array.from({ length: RATING_MIN_GAMES + 1 }, () => tally(A)), { history: true });
        expect(ratings.get(A).best).toBe(ratings.get(A).rating);
        // B settled with the fifth loss and lost again: the best is from then
        expect(ratings.get(B).best).toBeGreaterThan(ratings.get(B).rating);
        expect(clubRatings([tally(A)]).get(A).best).toBeNull();
        expect(ratings.get(A).points[0]).toMatchObject({ rating: 1024, change: 24, opponents: [B] });
        expect(clubRatings([tally(A)]).get(A).points).toBeUndefined();
    });

    it('a shared tournament game, kept by each club with its own players, counts once as a whole', () => {
        const moment = at();
        const host = { at: moment, sourceId: 'x', players: [A], winners: [] };
        const guest = { at: moment, sourceId: 'x', players: [B], winners: [B] };
        const merged = mergeTallies([host, guest, { at: moment, players: [A, C], winners: [A] }]);
        expect(merged).toHaveLength(2);
        expect(merged[0]).toMatchObject({ sourceId: 'x', players: [A, B], winners: [B], friendly: false });
        expect(clubRatings([host, guest]).size).toBe(0);
        expect(clubRatings(mergeTallies([host, guest])).get(B).rating).toBe(1024);
    });

    it('the history for a chart: the last rating of a day, at most maxPoints, the latest always', () => {
        const day = (index, hour = 18) => new Date(Date.UTC(2026, 0, 1 + index, hour));
        const points = [{ at: day(0, 18), rating: 1010 }, { at: day(0, 20), rating: 1020 }, { at: day(1), rating: 1005 }];
        expect(ratingHistory(points)).toEqual([{ at: day(0, 20), rating: 1020 }, { at: day(1), rating: 1005 }]);
        const long = Array.from({ length: 300 }, (_, index) => ({ at: day(index), rating: 1000 + index }));
        const chart = ratingHistory(long, { maxPoints: 120 });
        expect(chart).toHaveLength(120);
        expect(chart[0].rating).toBe(1000);
        expect(chart.at(-1).rating).toBe(1299);
        expect(chart.every((point, index) => !index || new Date(point.at) > new Date(chart[index - 1].at))).toBe(true);
    });

    it('the chances add up to 100 and favour the stronger', () => {
        const ratings = clubRatings(Array.from({ length: 6 }, () => tally(A)));
        const chances = winChances(ratings, [A, B]);
        expect(chances.a + chances.b).toBe(100);
        expect(chances.a).toBeGreaterThan(chances.b);
        expect(winChances(new Map(), [A, B, C])).toEqual(expect.objectContaining({ a: expect.any(Number) }));
        // the rounding rest goes to the biggest share, so three or four always make 100 too
        for (const values of [[1000, 1000, 1000], [1200, 1000, 950, 900], [1500, 700]]) {
            const ids = values.map((_, index) => `p${index}`);
            const chances = winChances(new Map(ids.map((id, index) => [id, { rating: values[index] }])), ids);
            expect(Object.values(chances).reduce((sum, value) => sum + value, 0)).toBe(100);
        }
        expect(winChances(new Map([[A, { rating: 1100 }]]), [A, B])).toEqual({ a: 64, b: 36 });
    });

    it('the board: members only, settled, played within a year; a player\'s place on it', () => {
        const now = new Date(Date.UTC(2026, 5, 1));
        const recent = new Date(Date.UTC(2026, 4, 1));
        const ratings = new Map([
            [A, { rating: 1100, games: 8, best: 1120, lastAt: recent }],
            [B, { rating: 1050, games: 6, best: 1050, lastAt: recent }],
            [C, { rating: 1200, games: 3, best: null, lastAt: recent }],
            ['old', { rating: 1300, games: 9, best: 1300, lastAt: new Date(Date.UTC(2025, 0, 1)) }],
            ['guest', { rating: 1400, games: 9, best: 1400, lastAt: recent }],
        ]);
        const board = ratingBoard(ratings, [A, B, C, 'old'], { now });
        expect(board).toEqual([{ player: A, value: 1100, games: 8 }, { player: B, value: 1050, games: 6 }]);
        expect(ratingFactsOf(ratings, board, B)).toEqual({ rating: 1050, games: 6, provisional: false, rank: 2, of: 2, best: 1050 });
        expect(ratingFactsOf(ratings, board, C)).toMatchObject({ provisional: true, rank: null, of: 2 });
        expect(ratingFactsOf(ratings, board, 'new')).toEqual({ rating: RATING_START, games: 0, provisional: true, rank: null, of: 2, best: null });
    });

    it('chances on the matches still to be played with both players known', () => {
        const ratings = new Map([[A, { rating: 1100 }]]);
        const matches = matchChances([
            { id: 'm1', status: 'ready', players: [A, B] },
            { id: 'm2', status: 'running', players: [B, A] },
            { id: 'm3', status: 'done', players: [A, B] },
            { id: 'm4', status: 'ready', players: [A, null] },
            { id: 'm5', status: 'waiting', players: [null, null] },
        ], ratings);
        expect(matches[0].chances).toEqual({ a: 64, b: 36 });
        expect(matches[1].chances).toEqual({ b: 36, a: 64 });
        expect(matches.slice(2).every(match => !match.chances)).toBe(true);
    });

    it('the most frequent opponents', () => {
        const tallies = [tally(A, [A, B]), tally(A, [A, B]), tally(A, [A, C])];
        expect(opponentsOf(tallies, A)).toEqual([{ playerId: B, games: 2 }, { playerId: C, games: 1 }]);
    });
});

describe('rivals', () => {
    it('the opponent played most and least, the best record and the toughest', async () => {
        const { rivalsOf } = await import('./compare.js');
        const game = (players, winner, type = 'x01') => ({ players, winners: [winner], sourceType: type });
        const tallies = [
            game([A, B], A), game([A, B], A), game([A, B], B), game([A, B], A, 'cricket'), game([A, B], A, 'cricket'), game([A, B], A, 'cricket'),
            game([A, C], C), game([A, C], C), game([A, C], A),
            game([A, 'd'], A),
        ];
        const rivals = rivalsOf(tallies, A);
        expect(rivals.mostPlayed).toMatchObject({ playerId: B, games: 6, wins: 5, losses: 1 });
        expect(['x01', 'cricket']).toContain(rivals.mostPlayed.type);
        expect(rivals.leastPlayed.playerId).toBe('d');
        expect(rivals.best.playerId).toBe(B);
        expect(rivals.worst).toMatchObject({ playerId: C, wins: 1, losses: 2 });
    });

    it('counts the partner of doubles as no opponent, and rates all four of doubles', async () => {
        const { rivalsOf } = await import('./compare.js');
        // A and C against B and 'd', won by A and C
        const doubles = { at: at(), players: [A, B, C, 'd'], winners: [A, C], teams: [[A, C], [B, 'd']], sourceType: 'x01' };
        expect(rivalsOf([doubles], A).opponents.map(entry => entry.playerId)).toEqual([B, 'd']);
        expect(rivalsOf([doubles], A).mostPlayed).toMatchObject({ wins: 1, losses: 0 });
        expect(opponentsOf([doubles], A).map(entry => entry.playerId)).toEqual([B, 'd']);
        expect(clubRatings([doubles]).size).toBe(4);
    });
});
