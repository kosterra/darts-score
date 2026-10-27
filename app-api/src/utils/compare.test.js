import { describe, it, expect } from 'vitest';
import { RATING_START, clubRatings, duelRecord, opponentsOf, rulesFigures, winChances, x01Highlights } from './compare.js';

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

    it('the chances add up to 100 and favour the stronger', () => {
        const ratings = clubRatings(Array.from({ length: 6 }, () => tally(A)));
        const chances = winChances(ratings, [A, B]);
        expect(chances.a + chances.b).toBe(100);
        expect(chances.a).toBeGreaterThan(chances.b);
        expect(winChances(new Map(), [A, B, C])).toEqual(expect.objectContaining({ a: expect.any(Number) }));
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

    it('counts the partner of doubles as no opponent, and leaves doubles out of the rating', async () => {
        const { rivalsOf } = await import('./compare.js');
        // A and C against B and 'd', won by A and C
        const doubles = { at: at(), players: [A, B, C, 'd'], winners: [A, C], teams: [[A, C], [B, 'd']], sourceType: 'x01' };
        expect(rivalsOf([doubles], A).opponents.map(entry => entry.playerId)).toEqual([B, 'd']);
        expect(rivalsOf([doubles], A).mostPlayed).toMatchObject({ wins: 1, losses: 0 });
        expect(opponentsOf([doubles], A).map(entry => entry.playerId)).toEqual([B, 'd']);
        expect(clubRatings([doubles]).size).toBe(0);
    });
});
