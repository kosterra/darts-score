import { describe, expect, it } from 'vitest';
import { gamesOverview } from './games.overview.js';

const now = new Date('2026-10-23T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 864e5);
const game = (winner, players, days, extra = {}) => ({
    players, createdAt: daysAgo(days), hasWinner: Boolean(winner), gameIsRunning: !winner,
    playerModels: Object.fromEntries(players.map(id => [id, { hasWonGame: id === winner }])), ...extra,
});

describe('gamesOverview', () => {
    const x01 = [game('a', ['a', 'b'], 1), game('a', ['a', 'b'], 2), game('b', ['a', 'b'], 40), game(null, ['a', 'g'], 0)];
    const rules = [game('b', ['a', 'b'], 3, { kind: 'golf' }), game('a', ['a', 'b'], 4, { kind: 'golf' }), game('a', ['a', 'b'], 5, { kind: 'golf' })];
    const overview = gamesOverview([{ type: 'x01', games: x01 }, { type: 'rules', games: rules }], new Set(['a', 'b']), now);

    it('counts the games, lately, running and by type (the newer games by their kind)', () => {
        expect(overview).toMatchObject({ total: 7, last30Days: 6, running: 1, players: 2 });
        expect(overview.popular).toEqual([{ type: 'x01', count: 4, last30Days: 3 }, { type: 'golf', count: 3, last30Days: 3 }]);
    });

    it('ranks the members (no guests) by games, with wins and the type they play most', () => {
        expect(overview.ranking[0]).toMatchObject({ playerId: 'a', games: 7, wins: 4, finished: 6, last30Days: 6, favourite: 'x01' });
        expect(overview.ranking.map(player => player.playerId)).toEqual(['a', 'b']);
    });

    it('keeps the win rates of players with enough finished games', () => {
        expect(overview.winRates).toEqual([{ playerId: 'a', games: 6, wins: 4, rate: 66.7 }, { playerId: 'b', games: 6, wins: 2, rate: 33.3 }]);
    });
});

describe('friendly games', () => {
    it('count for the games and the wins, but not for the win rates', () => {
        const game = (winner, friendly) => ({ players: ['a', 'b'], hasWinner: true, friendly, playerModels: { a: { hasWonGame: winner === 'a' }, b: { hasWonGame: winner === 'b' } }, createdAt: new Date() });
        const games = [...Array(5)].map(() => game('a', false)).concat([...Array(5)].map(() => game('b', true)));
        const overview = gamesOverview([{ type: 'x01', games }], new Set(['a', 'b']));
        expect(overview.ranking.find(entry => entry.playerId === 'a')).toMatchObject({ games: 10, wins: 5 });
        expect(overview.winRates.find(entry => entry.playerId === 'a')).toMatchObject({ games: 5, wins: 5, rate: 100 });
        expect(overview.winRates.find(entry => entry.playerId === 'b')).toMatchObject({ games: 5, wins: 0, rate: 0 });
    });
});
