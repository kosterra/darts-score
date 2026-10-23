import { describe, expect, it } from 'vitest';
import { validationResult } from 'express-validator';
import { validateClockCreate } from './game.validators.js';

const errorsOf = async (body) => {
    const req = { body };
    for (const rule of validateClockCreate) await rule.run(req);
    return validationResult(req).array().map(error => error.msg);
};

const game = { mode: 'All', skipAhead: true, numberOfPlayers: 2, players: ['a', 'b'], visits: [{ player: 'a', darts: ['S1', 'D2', 'T4'] }, { player: 'b', darts: ['0'] }] };

describe('validateClockCreate', () => {
    it('accepts a game with two to four players and its darts', async () => {
        expect(await errorsOf(game)).toEqual([]);
    });

    it('needs at least two players: alone it is a training', async () => {
        expect(await errorsOf({ ...game, numberOfPlayers: 1, players: ['a'], visits: [] })).toEqual(['numberOfPlayers must be 2, 3 or 4.']);
    });

    it('rejects an unknown mode, a dart that is not on the board, a visit of someone else and a wrong number of players', async () => {
        expect(await errorsOf({ ...game, mode: 'Quad' })).toHaveLength(1);
        expect(await errorsOf({ ...game, visits: [{ player: 'a', darts: ['T25'] }] })).toEqual(['Invalid dart.']);
        expect(await errorsOf({ ...game, visits: [{ player: 'c', darts: ['0'] }] })).toEqual(['Invalid player.']);
        expect(await errorsOf({ ...game, visits: [{ player: 'a', darts: ['0', '0', '0', '0'] }] })).toEqual(['A visit has at most three darts.']);
        expect(await errorsOf({ ...game, players: ['a', 'b', 'c'] })).toHaveLength(1);
    });
});
