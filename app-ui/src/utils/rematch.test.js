import { describe, it, expect } from 'vitest';
import { cricketRematch } from './cricket.rematch';
import { eliminationRematch } from './elimination.rematch';

describe('play again', () => {
    it('keeps the dart animation of the Cricket game, and its variant', () => {
        const game = { players: ['p1', 'p2'], startingScore: 0, variant: 'Cut-throat', flyingDarts: 'off' };
        expect(cricketRematch(game)).toMatchObject({ variant: 'Cut-throat', flyingDarts: 'off', players: ['p1', 'p2'] });
        expect(cricketRematch({ ...game, flyingDarts: 'on' }, { switchPlayers: true })).toMatchObject({ flyingDarts: 'on', players: ['p2', 'p1'] });
        expect(cricketRematch({ ...game, flyingDarts: undefined }).flyingDarts).toBe('players');
    });

    it('keeps the dart animation and the settings of the Elimination game', () => {
        const game = { players: ['p1', 'p2', 'p3'], targetScore: 301, gameInMode: 'Straight In', gameOutMode: 'Double Out', flyingDarts: 'off' };
        expect(eliminationRematch(game)).toMatchObject({ targetScore: 301, gameOutMode: 'Double Out', flyingDarts: 'off', currentPlayerTurn: 'p1' });
    });
});
