import {
    SET_LOADING,
    UPDATE_CURRENT_THROW,
    RESET_CURRENT_THROW,
    UPDATE_PLAYER_SCORE,
    UPDATE_ALL_THROWS,
    UPDATE_TOTAL_THROW,
    UPDATE_HITS,
    UPDATE_SECTION_HIT,
    CHANGE_CURRENT_PLAYER,
    GAME_HAS_WINNER,
    RETURN_PREV_PLAYER,
    FETCH_GAME_SUCCESS,
    FETCH_PLAYERS_SUCCESS
} from './constants';

const CricketReducer = (state, action) => {
    const { game, loading } = state;
    const { payload, type } = action;

    switch (type) {
        case FETCH_GAME_SUCCESS:
            return { ...state, game: { ...payload } };
        case FETCH_PLAYERS_SUCCESS:
            return { ...state, players: [...payload] };
        case UPDATE_CURRENT_THROW:
            return { ...state, game: { ...game, currentThrow: payload } };
        case RESET_CURRENT_THROW:
            return { ...state, game: { ...game, currentThrow: ['', '', ''] } };
        case UPDATE_PLAYER_SCORE:
        case UPDATE_TOTAL_THROW:
        case UPDATE_SECTION_HIT:
        case UPDATE_HITS: {
            const { playerId, ...update } = payload;
            return {
                ...state,
                game: {
                    ...game,
                    playerModels: {
                        ...game.playerModels,
                        [playerId]: {
                            ...game.playerModels[playerId],
                            ...update
                        }
                    }
                }
            };
        }
        case UPDATE_ALL_THROWS:
            return { ...state, game: { ...game, allThrows: payload } };
        case CHANGE_CURRENT_PLAYER:
            return { ...state, game: { ...game, currentPlayerTurn: payload } };
        case GAME_HAS_WINNER:
            return {
                ...state,
                game: {
                    ...game,
                    gameIsRunning: false,
                    hasWinner: true,
                    playerModels: {
                        ...game.playerModels,
                        [payload]: {
                            ...game.playerModels[payload],
                            hasWonGame: true
                        }
                    }
                }
            };
        case RETURN_PREV_PLAYER:
            return { ...state, game: payload };
        case SET_LOADING:
            return {
                ...state,
                loading: { ...loading, [payload.eventName]: payload.setTo }
            };
        default:
            return state;
    }
};

export default CricketReducer;
