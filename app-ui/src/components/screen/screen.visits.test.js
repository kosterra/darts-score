import { describe, expect, it } from 'vitest';
import { replayX01 } from '../../rules/x01';
import { newVisits } from './screen.visits';

const SETTINGS = { players: ['a', 'b'], startingScore: 301, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'First to', numberOfSets: 1, legMode: 'First to', numberOfLegs: 1 };
const game = (visits) => replayX01({ ...SETTINGS, visits });
const VISITS = [
    { player: 'a', darts: ['T20', 'T20', 'T20'] }, // 121 left
    { player: 'b', darts: ['S1', 'S1', 'S1'] },
    { player: 'a', darts: ['T20', 'S1', 'S1'] }, // 59 left
    { player: 'b', darts: ['S1', 'S1', 'S1'] },
];

describe('the visits a big screen has not seen yet', () => {
    it('tells the last visit by the score before it, also when the screen fell several behind', () => {
        const before = game(VISITS.slice(0, 1));
        const bust = newVisits(before, game([...VISITS, { player: 'a', darts: ['T20'] }]));
        expect(bust).toHaveLength(4);
        expect(bust.at(-1)).toMatchObject({ playerId: 'a', points: 0, busted: true, wonLeg: false });

        const checkout = newVisits(before, game([...VISITS, { player: 'a', darts: ['T19', 'D1'] }]));
        expect(checkout.at(-1)).toMatchObject({ playerId: 'a', points: 59, busted: false, wonLeg: true, wonMatch: true });
        expect(checkout.slice(0, -1).every(visit => !visit.busted && !visit.wonLeg)).toBe(true);
    });

    it('tells the one new visit by the game as it was', () => {
        const visits = newVisits(game(VISITS), game([...VISITS, { player: 'a', darts: ['T20'] }]));
        expect(visits).toEqual([{ playerId: 'a', points: 0, busted: true, wonLeg: false, wonSet: false, wonMatch: false }]);
    });

    it('gives none after an undo', () => {
        expect(newVisits(game(VISITS), game(VISITS.slice(0, 3)))).toEqual([]);
    });
});
