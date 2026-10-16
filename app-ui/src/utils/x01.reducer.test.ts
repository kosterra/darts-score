import { describe, it, expect } from 'vitest';
import X01Reducer from './x01.reducer';
import {
    UPDATE_CURRENT_THROW,
    RESET_CURRENT_THROW,
    UPDATE_PLAYER_SCORE,
    CHANGE_CURRENT_PLAYER,
    GAME_HAS_WINNER,
    INCREMENT_CURRENT_SET,
    INCREMENT_LEGS_PLAYED,
    SET_LOADING,
    FETCH_GAME_SUCCESS,
    FETCH_PLAYERS_SUCCESS,
} from './constants';

const makeState = (overrides: { game?: Record<string, unknown> } = {}) => ({
    loading: {},
    players: [],
    game: {
        currentThrow: ['', '', ''],
        currentSet: 1,
        legsPlayed: 0,
        currentPlayerTurn: 'p1',
        gameIsRunning: true,
        hasWinner: false,
        playerModels: {
            p1: { score: 501, hasWonGame: false },
            p2: { score: 501, hasWonGame: false },
        },
        ...overrides.game,
    },
    ...overrides,
});

describe('X01Reducer', () => {
    it('returns unchanged state for unknown action', () => {
        const state = makeState();
        expect(X01Reducer(state, { type: '__UNKNOWN__' })).toBe(state);
    });

    it('FETCH_GAME_SUCCESS replaces game', () => {
        const state = makeState();
        const newGame = { id: 'abc', currentThrow: ['T20', '', ''] };
        const next = X01Reducer(state, { type: FETCH_GAME_SUCCESS, payload: newGame });
        expect(next.game.id).toBe('abc');
    });

    it('FETCH_PLAYERS_SUCCESS replaces players array', () => {
        const state = makeState();
        const players = [{ id: 'p1' }, { id: 'p2' }];
        const next = X01Reducer(state, { type: FETCH_PLAYERS_SUCCESS, payload: players });
        expect(next.players).toHaveLength(2);
    });

    it('UPDATE_CURRENT_THROW sets the throw', () => {
        const state = makeState();
        const throw_ = ['T20', 'S5', 'D16'];
        const next = X01Reducer(state, { type: UPDATE_CURRENT_THROW, payload: throw_ });
        expect(next.game.currentThrow).toEqual(throw_);
    });

    it('RESET_CURRENT_THROW clears the throw to empty slots', () => {
        const state = makeState({ game: { currentThrow: ['T20', 'S5', 'D16'] } });
        const next = X01Reducer(state, { type: RESET_CURRENT_THROW });
        expect(next.game.currentThrow).toEqual(['', '', '']);
    });

    it('UPDATE_PLAYER_SCORE updates only the target player', () => {
        const state = makeState();
        const next = X01Reducer(state, {
            type: UPDATE_PLAYER_SCORE,
            payload: { playerId: 'p1', score: 341 },
        });
        expect(next.game.playerModels.p1.score).toBe(341);
        expect(next.game.playerModels.p2.score).toBe(501);
    });

    it('CHANGE_CURRENT_PLAYER updates currentPlayerTurn', () => {
        const state = makeState();
        const next = X01Reducer(state, { type: CHANGE_CURRENT_PLAYER, payload: 'p2' });
        expect(next.game.currentPlayerTurn).toBe('p2');
    });

    it('GAME_HAS_WINNER stops game and marks winner', () => {
        const state = makeState();
        const next = X01Reducer(state, { type: GAME_HAS_WINNER, payload: 'p1' });
        expect(next.game.gameIsRunning).toBe(false);
        expect(next.game.hasWinner).toBe(true);
        expect(next.game.playerModels.p1.hasWonGame).toBe(true);
        expect(next.game.playerModels.p2.hasWonGame).toBe(false);
    });

    it('INCREMENT_CURRENT_SET increments by 1', () => {
        const state = makeState();
        const next = X01Reducer({ ...state, game: { ...state.game, currentSetLeg: 3 } }, { type: INCREMENT_CURRENT_SET });
        expect(next.game.currentSet).toBe(2);
        expect(next.game.currentSetLeg).toBe(1);
    });

    it('INCREMENT_LEGS_PLAYED increments by 1', () => {
        const state = makeState();
        const next = X01Reducer(state, { type: INCREMENT_LEGS_PLAYED });
        expect(next.game.legsPlayed).toBe(1);
    });

    it('SET_LOADING sets a named loading flag', () => {
        const state = makeState();
        const next = X01Reducer(state, {
            type: SET_LOADING,
            payload: { eventName: 'fetchGame', setTo: true },
        });
        expect(next.loading.fetchGame).toBe(true);
    });

    it('does not mutate original state', () => {
        const state = makeState();
        const original = JSON.parse(JSON.stringify(state));
        X01Reducer(state, { type: CHANGE_CURRENT_PLAYER, payload: 'p2' });
        expect(state).toEqual(original);
    });
});
