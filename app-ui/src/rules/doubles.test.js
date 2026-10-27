import { describe, expect, it } from 'vitest';
import { partnersOf, replayX01, teamsOf } from './x01';

// doubles: a1 and a2 against b1 and b2, throwing a1, b1, a2, b2

const visit = (player, ...darts) => ({ player, darts });
const PLAYERS = ['a1', 'b1', 'a2', 'b2'];
const doubles = (visits, settings = {}) => replayX01({
    players: PLAYERS, visits, doubles: true, startingScore: 101, legInMode: 'Straight In', legOutMode: 'Double Out',
    setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3, ...settings,
});

describe('X01 doubles', () => {
    it('makes teams of the first and third, the second and fourth player', () => {
        expect(teamsOf({ doubles: true, players: PLAYERS })).toEqual([['a1', 'a2'], ['b1', 'b2']]);
        expect(partnersOf({ doubles: true, players: PLAYERS }, 'b2')).toEqual(['b1']);
        // only with four players, and only when asked for
        expect(teamsOf({ doubles: true, players: ['a', 'b'] })).toBeNull();
        expect(teamsOf({ players: PLAYERS })).toBeNull();
        expect(partnersOf({ players: PLAYERS }, 'a1')).toEqual([]);
    });

    it('shares the score of a team, while each player keeps their own figures', () => {
        const game = doubles([visit('a1', 'T20', '0', '0'), visit('b1', 'S20', '0', '0'), visit('a2', 'S1', '0', '0')]);
        expect(game.doubles).toBe(true);
        expect(game.playerModels.a1.score).toBe(40);
        expect(game.playerModels.a2.score).toBe(40);
        expect(game.playerModels.b2.score).toBe(81);
        expect(game.currentPlayerTurn).toBe('b2');
        expect(game.playerModels.a1.totalThrow.game).toEqual({ darts: 3, rounds: 1 });
        expect(game.playerModels.a2.bestThreeDarts.game.value).toBe(1);
        expect(game.playerModels.a1.bestThreeDarts.game.value).toBe(60);
    });

    it('counts the checkout of one player as the leg of the team, and the next leg starts with the next player', () => {
        const leg = [visit('a1', 'T20', '0', '0'), visit('b1', 'S20', '0', '0'), visit('a2', 'S1', 'D20')];
        const game = doubles(leg);
        expect(game.playerModels.a2.legsWon.game).toBe(1);
        expect(game.playerModels.a1.legsWon.game).toBe(1);
        expect(game.playerModels.a1.currentSetLegsWon).toBe(1);
        expect(game.playerModels.b1.currentSetLegsWon).toBe(0);
        // the checkout is the thrower's own
        expect(game.playerModels.a2.checkout.game.hit).toBe(1);
        expect(game.playerModels.a1.checkout.game.hit).toBe(0);
        // every score back at the start; b1 starts the second leg
        expect(PLAYERS.map(id => game.playerModels[id].score)).toEqual([101, 101, 101, 101]);
        expect(game.currentPlayerTurn).toBe('b1');
    });

    it('lets both partners win the game', () => {
        const leg = (first, second) => [visit(first[0], 'T20', '0', '0'), visit(second[0], '0', '0', '0'), visit(first[1], 'S1', 'D20')];
        // a wins the first leg (a1, a2); b1 starts the second, which a also wins with a2 checking out
        const game = doubles([
            ...leg(['a1', 'a2'], ['b1']),
            visit('b1', '0', '0', '0'), visit('a2', 'T20', '0', '0'), visit('b2', '0', '0', '0'), visit('a1', 'S1', 'D20'),
        ]);
        expect(game.hasWinner).toBe(true);
        expect(PLAYERS.filter(id => game.playerModels[id].hasWonGame)).toEqual(['a1', 'a2']);
        expect(game.playerModels.a2.setsWon).toBe(1);
    });

    it('compares the teams after a round limit', () => {
        const round = [visit('a1', 'S20', '0', '0'), visit('b1', 'S10', '0', '0'), visit('a2', 'S5', '0', '0'), visit('b2', 'S5', '0', '0')];
        // after one round of all four: a has 76 left, b 86
        const game = doubles(round, { roundLimit: 1 });
        expect(game.playerModels.a1.legsWon.game).toBe(1);
        expect(game.playerModels.a2.legsWon.game).toBe(1);
        expect(game.playerModels.b1.legsWon.game).toBe(0);
    });

    it('ignores a handicap, which would split a team', () => {
        const game = doubles([], { handicap: { a1: { startingScore: 301, legInMode: 'Straight In', legOutMode: 'Double Out' } } });
        expect(game.playerModels.a1.score).toBe(101);
    });
});
