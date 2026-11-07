import { describe, expect, it } from 'vitest';
import { buildLeaderboards, collectPlayerTotals } from './club.stats.controller.js';

const game = (players, winners) => ({ players, playerModels: Object.fromEntries(players.map(id => [id, { hasWonGame: winners.includes(id) }])) });

describe('the club leaderboards', () => {
    it('count no win for a game alone, nor the game in the win rate', () => {
        const games = [
            ...Array.from({ length: 5 }, () => game(['a', 'b'], ['b'])),
            // a practises alone and "wins" every time
            ...Array.from({ length: 5 }, () => game(['a'], ['a'])),
        ];
        const totals = collectPlayerTotals([{ type: 'x01', games }]);
        expect(totals.get('a')).toMatchObject({ games: 10, againstOthers: 5, wins: 0, winsX01: 0 });
        const boards = buildLeaderboards(totals, new Set(['a', 'b']));
        expect(boards.mostWins).toEqual([{ player: 'b', value: 5 }]);
        expect(boards.winRate).toEqual([{ player: 'b', value: 100 }]);
        expect(boards.mostGames[0]).toEqual({ player: 'a', value: 10 });
    });

    it('give both partners of doubles the win', () => {
        const totals = collectPlayerTotals([{ type: 'x01', games: [game(['a', 'b', 'c', 'd'], ['a', 'c'])] }]);
        expect([...totals].map(([id, entry]) => [id, entry.wins])).toEqual([['a', 1], ['b', 0], ['c', 1], ['d', 0]]);
    });
});
