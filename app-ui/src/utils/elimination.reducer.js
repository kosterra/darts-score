import {
    SET_LOADING,
    UPDATE_CURRENT_THROW,
    SAVE_ALL_GAME_THROWS,
    RESET_CURRENT_THROW,
    UPDATE_PLAYER_SCORE,
    CHANGE_CURRENT_PLAYER,
    GAME_HAS_WINNER,
    RETURN_PREV_PLAYER,
    FETCH_GAME_SUCCESS,
    FETCH_PLAYERS_SUCCESS
} from './constants';

const EliminationReducer = (state, action) => {
    switch (action.type) {
        case FETCH_GAME_SUCCESS:
            return { ...state, game: { ...action.payload } };

        case FETCH_PLAYERS_SUCCESS:
            return { ...state, players: [...action.payload] };

        case UPDATE_CURRENT_THROW:
            return { ...state, game: { ...state.game, currentThrow: action.payload } };

        case SAVE_ALL_GAME_THROWS:
            return { ...state, game: { ...state.game, allThrows: action.payload } };

        case RESET_CURRENT_THROW:
            return { ...state, game: { ...state.game, currentThrow: ['', '', ''] } };

        case UPDATE_PLAYER_SCORE: {
            const { playerId, score, playerModel } = action.payload;
            const updatedModel = playerModel
                ? playerModel
                : { ...state.game.playerModels[playerId], score };
            return {
                ...state,
                game: {
                    ...state.game,
                    playerModels: {
                        ...state.game.playerModels,
                        [playerId]: updatedModel
                    }
                }
            };
        }

        case CHANGE_CURRENT_PLAYER:
            return { ...state, game: { ...state.game, currentPlayerTurn: action.payload } };

        case GAME_HAS_WINNER:
            return {
                ...state,
                game: {
                    ...state.game,
                    gameIsRunning: false,
                    hasWinner: true,
                    playerModels: {
                        ...state.game.playerModels,
                        [action.payload]: {
                            ...state.game.playerModels[action.payload],
                            hasWonGame: true
                        }
                    }
                }
            };

        case RETURN_PREV_PLAYER:
            return { ...state, game: action.payload };

        case SET_LOADING:
            return {
                ...state,
                loading: { ...state.loading, [action.payload.eventName]: action.payload.setTo }
            };

        default:
            return state;
    }
};

export default EliminationReducer;
