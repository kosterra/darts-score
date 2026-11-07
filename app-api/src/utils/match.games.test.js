import { beforeEach, describe, expect, it, vi } from 'vitest';

// the games in memory, and the queries made of them
let games = [];
const queries = [];
vi.mock('../models/db.model.js', () => ({
    default: {
        x01: {
            find: (query, fields) => {
                queries.push({ query, fields });
                const ids = query._id.$in.map(String);
                return { lean: async () => games.filter(game => ids.includes(String(game._id))) };
            },
        },
    },
}));

const { withMatchGames } = await import('./match.games.js');

beforeEach(() => {
    games = [];
    queries.length = 0;
});

describe('withMatchGames', () => {
    it('adds the levels played at to the matches with a game, in one query', async () => {
        games = [
            { _id: 'g1', playLevels: [{ player: 'b', level: 'pro' }, { player: 'a', level: 'amateur' }], playerModels: {} },
            { _id: 'g2', playLevels: [{ player: 'c', level: 'worldClass' }] },
        ];
        const matches = [
            { id: '4-0', players: ['a', 'b'], status: 'done', game: 'g1', score: { legs: [3, 1] } },
            { id: '4-1', players: ['c', 'd'], status: 'done', game: 'g2', score: { legs: [3, 0] } },
            { id: '2-0', players: ['a', 'c'], status: 'walkover', game: null, score: null },
        ];
        const result = await withMatchGames(matches);
        expect(queries).toHaveLength(1);
        expect(queries[0].query._id.$in).toEqual(['g1', 'g2']);
        expect(result[0]).toMatchObject({ score: { legs: [3, 1] }, playLevels: [{ player: 'b', level: 'pro' }, { player: 'a', level: 'amateur' }] });
        expect(result[0].live).toBeUndefined();
        expect(result[1].playLevels).toEqual([{ player: 'c', level: 'worldClass' }]);
        // a walkover has no game: as it was
        expect(result[2]).toBe(matches[2]);
    });

    it('gives a match going on its score so far: the legs, and the sets when played in sets', async () => {
        games = [
            { _id: 'g1', numberOfSets: 1, playerModels: { a: { legsWon: { game: 2 } }, b: { legsWon: { game: 1 } } } },
            { _id: 'g2', numberOfSets: 3, playerModels: { c: { setsWon: 1, currentSetLegsWon: 0, legsWon: { game: 3 } }, d: { setsWon: 0, currentSetLegsWon: 2, legsWon: { game: 3 } } } },
        ];
        const [legs, sets] = await withMatchGames([
            { id: 'd1-0', players: ['b', 'a'], status: 'running', game: 'g1' },
            { id: 'd1-1', players: ['c', 'd'], status: 'running', game: 'g2' },
        ]);
        expect(legs.live).toEqual({ legs: [1, 2] });
        expect(legs.playLevels).toEqual([]);
        expect(sets.live).toEqual({ legs: [0, 2], sets: [1, 0] });
    });

    it('asks nothing when no match has a game, and leaves a game that is gone', async () => {
        const matches = [{ id: '4-0', players: ['a', 'b'], status: 'ready', game: null }];
        expect(await withMatchGames(matches)).toBe(matches);
        expect(queries).toHaveLength(0);
        const gone = [{ id: '4-0', players: ['a', 'b'], status: 'done', game: 'g9', score: { legs: [3, 2] } }];
        expect(await withMatchGames(gone)).toEqual(gone);
    });
});
