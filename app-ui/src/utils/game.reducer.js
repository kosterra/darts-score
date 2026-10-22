import { FETCH_GAME_SUCCESS, FETCH_PLAYERS_SUCCESS, SET_GAME, SET_LOADING, UPDATE_CURRENT_THROW } from './constants';

/**
 * The state of a game page (X01, Cricket, Elimination): the game, worked out
 * by the rules engine from its visits after every visit and undo, the darts
 * typed for the visit at the oche, the players and what is loading.
 */
const GameReducer = (state, action) => {
    switch (action.type) {
        case FETCH_GAME_SUCCESS:
        case SET_GAME:
            return { ...state, game: { ...action.payload } };
        case FETCH_PLAYERS_SUCCESS:
            return { ...state, players: [...action.payload] };
        case UPDATE_CURRENT_THROW:
            return { ...state, game: { ...state.game, currentThrow: action.payload } };
        case SET_LOADING:
            return { ...state, loading: { ...state.loading, [action.payload.eventName]: action.payload.setTo } };
        default:
            return state;
    }
};

export default GameReducer;
