import { describe, expect, it } from 'vitest';
import GameReducer from './game.reducer';
import { FETCH_GAME_SUCCESS, FETCH_PLAYERS_SUCCESS, SET_GAME, SET_LOADING, UPDATE_CURRENT_THROW } from './constants';

const state = { loading: {}, players: [], game: { id: 'g', currentThrow: ['', '', ''] } };

describe('GameReducer', () => {
    it('leaves the state for an unknown action', () => {
        expect(GameReducer(state, { type: '__UNKNOWN__' })).toBe(state);
    });

    it('takes the game as loaded, and as worked out after a visit or undo', () => {
        expect(GameReducer(state, { type: FETCH_GAME_SUCCESS, payload: { id: 'h' } }).game.id).toBe('h');
        expect(GameReducer(state, { type: SET_GAME, payload: { id: 'i' } }).game.id).toBe('i');
    });

    it('keeps the players, the darts typed and what is loading', () => {
        expect(GameReducer(state, { type: FETCH_PLAYERS_SUCCESS, payload: [{ id: 'p' }] }).players).toEqual([{ id: 'p' }]);
        expect(GameReducer(state, { type: UPDATE_CURRENT_THROW, payload: ['T20', '', ''] }).game.currentThrow).toEqual(['T20', '', '']);
        expect(GameReducer(state, { type: SET_LOADING, payload: { eventName: 'validateThrow', setTo: true } }).loading.validateThrow).toBe(true);
    });
});
