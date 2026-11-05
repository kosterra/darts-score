import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useBotMood from './use.bot.mood';

// the tests compile JSX the classic way, which needs React at hand
globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// a game of 501 between Anna (p1) and the bot; visits as { playerId, roundScore, scoreLeft }
const gameOf = ({ visits = [], turn = 'p1', legs = { p1: 0, bot: 0 }, winner = null } = {}) => ({
    startingScore: 501,
    players: ['p1', 'bot'],
    currentPlayerTurn: turn,
    hasWinner: Boolean(winner),
    currentLegThrows: visits,
    playerModels: {
        p1: { legsWon: { game: legs.p1 }, hasWonGame: winner === 'p1' },
        bot: { legsWon: { game: legs.bot }, hasWonGame: winner === 'bot' },
    },
});

// renders the hook with a game that the test changes: → { mood(), show(game) }
const renderMood = (game) => {
    const latest = {};
    const container = document.createElement('div');
    const root = createRoot(container);
    const Probe = ({ value }) => {
        latest.mood = useBotMood(value, 'bot');
        return null;
    };
    act(() => root.render(<Probe value={game} />));
    return {
        mood: () => latest.mood,
        show: (next) => act(() => root.render(<Probe value={next} />)),
        unmount: () => act(() => root.unmount()),
    };
};

describe('the bot\'s mood', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('is idle at the player\'s turn and throwing at its own', () => {
        const probe = renderMood(gameOf());
        expect(probe.mood()).toBe('idle');
        probe.show(gameOf({ turn: 'bot' }));
        expect(probe.mood()).toBe('throwing');
        probe.unmount();
    });

    it('is happy about a ton of its own for a moment, sad about its bust, surprised by the player\'s 180', () => {
        const probe = renderMood(gameOf());
        probe.show(gameOf({ visits: [{ playerId: 'bot', roundScore: 140, scoreLeft: 361 }] }));
        expect(probe.mood()).toBe('happy');
        act(() => vi.advanceTimersByTime(3000));
        expect(probe.mood()).toBe('idle');

        // 501 left before and after: the darts took nothing off
        const bust = [{ playerId: 'bot', roundScore: 140, scoreLeft: 361 }, { playerId: 'p1', roundScore: 60, scoreLeft: 441 }, { playerId: 'bot', roundScore: 400, scoreLeft: 361 }];
        probe.show(gameOf({ visits: bust }));
        expect(probe.mood()).toBe('sad');

        probe.show(gameOf({ visits: [...bust, { playerId: 'p1', roundScore: 180, scoreLeft: 261 }] }));
        expect(probe.mood()).toBe('surprised');
        probe.unmount();
    });

    it('is happy about a leg it won, sad about a leg lost, and at the end for good', () => {
        const probe = renderMood(gameOf());
        probe.show(gameOf({ legs: { p1: 0, bot: 1 } }));
        expect(probe.mood()).toBe('happy');
        probe.show(gameOf({ legs: { p1: 1, bot: 1 } }));
        expect(probe.mood()).toBe('sad');
        probe.show(gameOf({ legs: { p1: 1, bot: 2 }, winner: 'bot' }));
        act(() => vi.advanceTimersByTime(5000));
        expect(probe.mood()).toBe('happy');
        probe.unmount();
    });
});
