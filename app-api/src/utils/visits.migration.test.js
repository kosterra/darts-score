import { describe, expect, it } from 'vitest';
import { convertGame } from './visits.migration.js';

// an X01 game as the app stored it before visits: one leg, won by the second player, who also started
const legacy = {
    startingScore: 101, setMode: 'Best of', legMode: 'Best of', legInMode: 'Straight In', legOutMode: 'Double Out',
    numberOfSets: 1, numberOfLegs: 1, players: ['a', 'b'], currentSet: 0, currentSetLeg: 0, setsPlayed: 1, legsPlayed: 1,
    gameIsRunning: false, hasWinner: true, currentLegThrows: [],
    allSetsThrows: { 'set-1': { 'leg-1': [
        { playerId: 'b', darts: ['T20', 'S1', '0'], roundScore: 61, scoreLeft: 40 },
        { playerId: 'a', darts: ['0', '0', '0'], roundScore: 0, scoreLeft: 101 },
        { playerId: 'b', darts: ['D20', '', ''], roundScore: 40, scoreLeft: 0 },
    ] } },
    playerModels: { a: { hasWonGame: false, score: 101 }, b: { hasWonGame: true, score: 0 } },
};

describe('the move to visits', () => {
    it('keeps the visits, who started and the result, and drops what follows from the visits', () => {
        const { set, unset, changed } = convertGame('x01', legacy);
        expect(set.visits).toEqual([{ player: 'b', darts: ['T20', 'S1', '0'] }, { player: 'a', darts: ['0', '0', '0'] }, { player: 'b', darts: ['D20'] }]);
        expect(set.starter).toBe('b');
        expect(set.hasWinner).toBe(true);
        expect(set.playerModels.b.hasWonGame).toBe(true);
        expect(Object.keys(unset).sort()).toEqual(['allSetsThrows', 'currentLegThrows', 'currentSet', 'currentSetLeg', 'legsPlayed', 'setsPlayed']);
        expect(changed).toBe(false);
    });

    it('tells when the visits give another result than was stored', () => {
        const { changed } = convertGame('x01', { ...legacy, playerModels: { a: { hasWonGame: true }, b: { hasWonGame: false } } });
        expect(changed).toBe(true);
    });

    it('moves Around the Clock from the values of its darts to the fields hit', () => {
        const { set, unset } = convertGame('clock', { mode: 'Single', players: ['a', 'b'], throws: [1, 1, 0] });
        expect(set.visits).toEqual([{ player: 'a', darts: ['S1', 'S2', '0'] }]);
        expect(unset).toEqual({ throws: '' });
    });
});
