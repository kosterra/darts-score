import { describe, expect, it } from 'vitest';
import { storedOf, viewOf, withView } from './game.view.js';
import { legsInOrder } from './badges.js';
import { checkX01 } from './integrity.js';

const x01 = {
    startingScore: 101, setMode: 'Best of', legMode: 'Best of', legInMode: 'Straight In', legOutMode: 'Double Out',
    numberOfSets: 1, numberOfLegs: 1, players: ['a', 'b'],
    visits: [{ player: 'a', darts: ['T20', 'S1', '0'] }, { player: 'b', darts: ['0', '0', '0'] }, { player: 'a', darts: ['D20'] }],
};

describe('games stored as their visits', () => {
    it('stores X01 doubles with the results of the teams worked out', () => {
        const visit = (player, ...darts) => ({ player, darts });
        const stored = storedOf('x01', {
            players: ['a1', 'b1', 'a2', 'b2'], doubles: true, startingScore: 101, legInMode: 'Straight In', legOutMode: 'Double Out',
            setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1,
            visits: [visit('a1', 'T20', 'S1', '0'), visit('b1', 'S20', '0', '0'), visit('a2', 'D20')],
            // what the app sends is worked out again here
            playerModels: { a1: { score: 101 }, b1: { score: 101 }, a2: { score: 101 }, b2: { score: 101 } },
        });
        expect(stored.doubles).toBe(true);
        expect(stored.hasWinner).toBe(true);
        expect(['a1', 'b1', 'a2', 'b2'].filter(id => stored.playerModels[id].hasWonGame)).toEqual(['a1', 'a2']);
        expect(stored.handicap).toBeUndefined();
    });

    it('keep their results, worked out here whatever the app sent', () => {
        const stored = storedOf('x01', { ...x01, hasWinner: false, playerModels: {}, currentSet: 7 });
        expect(stored.hasWinner).toBe(true);
        expect(stored.gameIsRunning).toBe(false);
        expect(stored.playerModels.a.hasWonGame).toBe(true);
        expect(stored.currentSet).toBeUndefined();
    });

    it('take what an older app played from the legs it sends', () => {
        const older = { ...viewOf('x01', x01), visits: [] };
        const stored = storedOf('x01', older);
        expect(stored.visits).toEqual(x01.visits);
        expect(stored.allSetsThrows).toBeUndefined();
        expect(stored.hasWinner).toBe(true);
    });

    it('keep the players\' own rules of a handicap', () => {
        const stored = storedOf('x01', { ...x01, visits: [], playerModels: { a: { startingScore: 301, legInMode: 'Straight In', legOutMode: 'Straight Out' } } });
        expect(stored.handicap).toEqual({ a: { startingScore: 301, legInMode: 'Straight In', legOutMode: 'Straight Out' } });
        expect(stored.playerModels.a.score).toBe(301);
    });

    it('are read with their legs and visits, worked out from the visits', () => {
        const view = viewOf('x01', x01);
        expect(view.allSetsThrows['set-1']['leg-1'].map(visit => visit.scoreLeft)).toEqual([40, 101, 0]);
        expect(legsInOrder(x01)).toHaveLength(1);
        expect(checkX01(x01).filter(found => found.level === 'impossible')).toEqual([]);
    });

    it('leave a game worked out already as it is', () => {
        const view = viewOf('x01', x01);
        expect(withView('x01', view)).toBe(view);
    });

    it('read a game not moved to visits yet from what it was stored as', () => {
        const old = { mode: 'Double', players: ['a', 'b'], throws: [1, 0, 1] };
        expect(viewOf('clock', old).visits).toEqual([{ player: 'a', darts: ['D1', '0', 'D2'] }]);
    });

    it('turn Around the Clock into the values of its darts', () => {
        const view = viewOf('clock', { mode: 'Double', players: ['a', 'b'], visits: [{ player: 'a', darts: ['D1', '0', 'D2'] }] });
        expect(view.throws).toEqual([1, 0, 1]);
        expect(view.currentPlayerTurn).toBe('b');
    });
});
