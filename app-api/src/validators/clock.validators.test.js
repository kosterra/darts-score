import { describe, expect, it } from 'vitest';
import { validationResult } from 'express-validator';
import { validateClockCreate } from './game.validators.js';

const errorsOf = async (body) => {
    const req = { body };
    for (const rule of validateClockCreate) await rule.run(req);
    return validationResult(req).array().map(error => error.msg);
};

const game = { mode: 'All', skipAhead: true, numberOfPlayers: 2, players: ['a', 'b'], throws: [0, 1, 2, 3] };

describe('validateClockCreate', () => {
    it('accepts a game with two to four players and its darts', async () => {
        expect(await errorsOf(game)).toEqual([]);
    });

    it('needs at least two players: alone it is a training', async () => {
        expect(await errorsOf({ ...game, numberOfPlayers: 1, players: ['a'] })).toEqual(['numberOfPlayers must be 2, 3 or 4.']);
    });

    it('rejects an unknown mode, a dart that is not 0 to 3 and a wrong number of players', async () => {
        expect(await errorsOf({ ...game, mode: 'Quad' })).toHaveLength(1);
        expect(await errorsOf({ ...game, throws: [4] })).toEqual(['each throw must be 0, 1, 2 or 3.']);
        expect(await errorsOf({ ...game, players: ['a', 'b', 'c'] })).toHaveLength(1);
    });
});
