import { describe, expect, it } from 'vitest';
import { replayX01 } from './x01.js';
import { replayCricket } from './cricket.js';
import { replayElimination } from './elimination.js';
import { clockThrows, clockVisits, replayClockGame } from './clock.js';

const visit = (player, ...darts) => ({ player, darts });

describe('X01 on the engine', () => {
    const game = (visits, settings = {}) => replayX01({
        startingScore: 101, setMode: 'Best of', legMode: 'Best of', legInMode: 'Straight In', legOutMode: 'Double Out',
        numberOfSets: 1, numberOfLegs: 3, players: ['a', 'b'], visits, ...settings,
    });

    it('scores, keeps the visit and passes the turn', () => {
        const state = game([visit('a', 'T20', 'S1', '0')]);
        expect(state.playerModels.a.score).toBe(40);
        expect(state.currentPlayerTurn).toBe('b');
        expect(state.currentLegThrows).toEqual([{ playerId: 'a', darts: ['T20', 'S1', '0'], roundScore: 61, scoreLeft: 40 }]);
        expect(state.playerModels.a.averages.game.overall).toBe(61);
        expect(state.playerModels.a.scoreRanges.game['60-79']).toBe(1);
    });

    it('keeps the score after a bust, which counts as a visit of 0', () => {
        const state = game([visit('a', 'T20', 'T20', '0')]);
        expect(state.playerModels.a.score).toBe(101);
        expect(state.playerModels.a.averages.game.overall).toBe(0);
        expect(state.playerModels.a.scoreRanges.game.Busted).toBe(1);
        expect(state.currentLegThrows[0].scoreLeft).toBe(101);
    });

    it('wins a leg with a double, the next leg starts with the next player', () => {
        const state = game([visit('a', 'T20', 'S1', '0'), visit('b', '0', '0', '0'), visit('a', 'D20')]);
        expect(state.allSetsThrows['set-1']['leg-1']).toHaveLength(3);
        expect(state.playerModels.a.legsWon).toEqual({ game: 1, 'set-1': 1 });
        expect(state.playerModels.a.checkoutScores.game).toEqual({ 40: 1 });
        // the third dart of the first visit already missed a chance at 40
        expect(state.playerModels.a.checkout.game).toEqual({ total: 2, miss: 1, hit: 1 });
        expect(state.currentSetLeg).toBe(2);
        expect(state.currentPlayerTurn).toBe('b');
        expect(state.playerModels.a.score).toBe(101);
    });

    it('wins the game with the legs it takes, and undo is the game without its last visit', () => {
        const legs = [visit('a', 'T20', 'S1', '0'), visit('b', '0', '0', '0'), visit('a', 'D20'),
            visit('b', '0', '0', '0'), visit('a', 'T20', 'S1', '0'), visit('b', '0', '0', '0'), visit('a', 'D20')];
        const state = game(legs);
        expect(state.hasWinner).toBe(true);
        expect(state.playerModels.a.hasWonGame).toBe(true);
        expect(state.currentSet).toBe(0);
        const undone = game(legs.slice(0, -1));
        expect(undone.hasWinner).toBe(false);
        expect(undone.currentPlayerTurn).toBe('a');
        expect(undone.playerModels.a.score).toBe(40);
    });

    it('plays every player by their own handicap', () => {
        const state = game([visit('a', 'S1')], { handicap: { a: { startingScore: 1, legInMode: 'Straight In', legOutMode: 'Straight Out' } } });
        expect(state.playerModels.a.legsWon.game).toBe(1);
    });
});

describe('Cricket on the engine', () => {
    const game = (visits, variant = 'Standard') => replayCricket({ variant, players: ['a', 'b'], visits });

    it('marks, then scores the marks beyond three while the other has the number open', () => {
        const state = game([visit('a', 'T20', 'T20', 'S19')]);
        expect(state.playerModels.a.sectionHit['20']).toBe(6);
        expect(state.playerModels.a.score).toBe(60);
        expect(state.playerModels.a.hit).toEqual({ T20: 2, S19: 1 });
    });

    it('gives the points to the opponents in cut-throat', () => {
        const state = game([visit('a', 'T20', 'T20', '0')], 'Cut-throat');
        expect(state.playerModels.a.score).toBe(0);
        expect(state.playerModels.b.score).toBe(60);
    });

    it('is won by closing everything with the most points', () => {
        const all = [visit('a', 'T20', 'T19', 'T18'), visit('b', '0', '0', '0'), visit('a', 'T17', 'T16', 'T15'), visit('b', '0', '0', '0'), visit('a', 'D25', 'S25')];
        const state = game(all);
        expect(state.hasWinner).toBe(true);
        expect(state.playerModels.a.hasWonGame).toBe(true);
    });
});

describe('Elimination on the engine', () => {
    const game = (visits) => replayElimination({ targetScore: 101, gameInMode: 'Straight In', gameOutMode: 'Double Out', players: ['a', 'b'], visits });

    it('sends a player back to 0 by landing on their score', () => {
        const state = game([visit('a', 'S20', '0', '0'), visit('b', 'S10', 'S10', '0')]);
        expect(state.playerModels.a.score).toBe(0);
        expect(state.playerModels.b.score).toBe(20);
    });

    it('busts above the target, and wins on it with a double', () => {
        expect(game([visit('a', 'T20', 'T20', '0')]).playerModels.a.score).toBe(0);
        const won = game([visit('a', 'T20', 'S1', '0'), visit('b', '0', '0', '0'), visit('a', 'D20')]);
        expect(won.hasWinner).toBe(true);
        expect(won.playerModels.a.hasWonGame).toBe(true);
    });
});

describe('Around the Clock on the engine', () => {
    it('stores the fields hit and gives back the values of the darts', () => {
        const game = { players: ['a', 'b'], mode: 'Double', skipAhead: false };
        const throws = [1, 0, 1, 0, 0, 0, 1, 1, 1];
        const visits = clockVisits(game, throws);
        expect(visits[0]).toEqual({ player: 'a', darts: ['D1', '0', 'D2'] });
        expect(clockThrows(game, visits)).toEqual(throws);
    });

    it('moves on two numbers with a double when skipping ahead', () => {
        const game = { players: ['a'], mode: 'All', skipAhead: true };
        const view = replayClockGame({ ...game, visits: [visit('a', 'D1', 'T3', 'S6')] });
        expect(view.playerModels.a.target).toBe(6);
        expect(view.throws).toEqual([2, 3, 1]);
    });

    it('ends once the round of the first to finish is complete', () => {
        const game = { players: ['a', 'b'], mode: 'All', skipAhead: true };
        const visits = [visit('a', 'T1', 'T4', 'T7'), visit('b', '0', '0', '0'), visit('a', 'T10', 'T13', 'T16'), visit('b', '0', '0', '0'), visit('a', 'T19', 'S25'), visit('b', 'S1', '0', '0')];
        const view = replayClockGame({ ...game, visits });
        expect(view.hasWinner).toBe(true);
        expect(view.playerModels.a.hasWonGame).toBe(true);
        expect(view.playerModels.b.rank).toBe(2);
    });
});
