import { describe, it, expect } from 'vitest';
import { stepsOf } from './first.steps.js';

const none = { clubHasFace: false, otherPlayers: 0, clubHasRules: false, clubHasGame: false, myGame: false, playerComplete: false, myTraining: false, notificationsChosen: false };

describe('the first steps', () => {
    it('for an admin: the club first, then the first game and the own player', () => {
        const steps = stepsOf(true, { ...none, otherPlayers: 3, clubHasGame: true });
        expect(steps.role).toBe('admin');
        expect(steps.items).toEqual([
            { id: 'clubProfile', done: false }, { id: 'players', done: true }, { id: 'rules', done: false },
            { id: 'firstGame', done: true }, { id: 'you', done: false },
        ]);
    });

    it('for a member: the own player, game, training and notifications; the app is told by the device', () => {
        const steps = stepsOf(false, { ...none, clubHasGame: true, myTraining: true, notificationsChosen: true });
        expect(steps.role).toBe('member');
        expect(steps.items.map(item => [item.id, item.done])).toEqual([['you', false], ['firstGame', false], ['training', true], ['notifications', true], ['app', null]]);
    });
});
