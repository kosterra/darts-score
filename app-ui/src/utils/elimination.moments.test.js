import { describe, it, expect } from 'vitest';
import { knockOutScene } from './elimination.moments';

const players = [{ id: 'a', nickname: 'Anna' }, { id: 'b', nickname: 'Ben' }, { id: 'c', nickname: 'Cleo' }];
const game = (allThrows = []) => ({ targetScore: 301, gameOutMode: 'Double Out', players: ['a', 'b', 'c'], allThrows });

describe('knockOutScene', () => {
    it('is a strike when two are sent back at once', () => {
        const scene = knockOutScene({ game: game(), players, playerId: 'a', eliminations: ['b', 'c'], scoresBefore: { a: 40, b: 60, c: 60 } });
        expect(scene).toMatchObject({ kind: 'strike', by: 'Anna', victims: [{ name: 'Ben' }, { name: 'Cleo' }] });
    });

    it('is so close when the one sent back was on a finish', () => {
        const scene = knockOutScene({ game: game(), players, playerId: 'a', eliminations: ['b'], scoresBefore: { a: 200, b: 261 } });
        expect(scene).toMatchObject({ kind: 'close', victims: [{ name: 'Ben', left: 40 }] });
    });

    it('is revenge when the one sent back had sent this player back before', () => {
        // Ben lands on Anna's 60 first; later Anna lands on Ben's score
        const earlier = [
            { playerId: 'a', darts: ['T20', '0', '0'], roundScore: 60 },
            { playerId: 'b', darts: ['T20', '0', '0'], roundScore: 60 },
        ];
        const scene = knockOutScene({ game: game(earlier), players, playerId: 'a', eliminations: ['b'], scoresBefore: { a: 0, b: 60 } });
        expect(scene.kind).toBe('revenge');
    });

    it('is a plain kick otherwise', () => {
        expect(knockOutScene({ game: game(), players, playerId: 'a', eliminations: ['b'], scoresBefore: { a: 40, b: 60 } }).kind).toBe('kick');
    });
});
