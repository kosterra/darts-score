import { 
    INIT_NEW_GAME,
    RESET_GAME,
    SET_LOADING,
    UPDATE_CURRENT_THROW,
    PUSH_TO_CURRENT_LEG_THROWS,
    RESET_CURRENT_THROW,
    SAVE_CURRENT_LEG_THROWS,
    RESET_CURRENT_LEG_THROWS,
    UPDATE_PLAYER_SCORE,
    RESET_SCORES,
    UPDATE_AVERAGES,
    INCREMENT_TOTAL_THROW,
    UPDATE_BEST_THREE_DARTS,
    UPDATE_CHECKOUT_SCORE,
    UPDATE_SECTION_HIT,
    UPDATE_SCORE_RANGES,
    UPDATE_DOUBLE_OUT,
    INCREMENT_LEG_WON,
    INCREMENT_SET_WON,
    RESET_PLAYER_LEG,
    CHANGE_CURRENT_PLAYER,
    CHANGE_STARTING_PLAYER_SET,
    CHANGE_STARTING_PLAYER_LEG,
    GAME_HAS_WINNER,
    RETURN_PREV_PLAYER,
    THROW_ERROR,
    RESET_ERROR
  } from './constants';
  
  const X01Reducer = (state, action) => {
    switch (action.type) {
      case INIT_NEW_GAME:
        return {
          ...state,
          game: {...action.payload},
        };
      case RESET_GAME: 
        return {
          ...state,
          game: {...action.payload},
        };
      case UPDATE_CURRENT_THROW:
        return {
          ...state,
          game: {...state.game, currentThrow: action.payload}
        };
      case PUSH_TO_CURRENT_LEG_THROWS:
        return {
          ...state,
          game: {
            ...state.game,
            currentLegThrows: [...state.game.currentLegThrows, action.payload]
          }
        };
      case RESET_CURRENT_THROW:
        return {
          ...state,
          game: {
            ...state.game,
            currentThrow: ['','','']
          }
        };
      case SAVE_CURRENT_LEG_THROWS:
        return {
          ...state,
          game: {
            ...state.game,
            allLegsThrows: [...state.game.allLegsThrows, action.payload]
          }
        };
      case RESET_CURRENT_LEG_THROWS:
        return {
          ...state,
          game: {
            ...state.game,
            currentLegThrows: []
          }
        };
      case UPDATE_PLAYER_SCORE: 
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName] : {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                score: action.payload.score
              }
            }
          }
        };
      case RESET_SCORES:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload] : {
                ...state.game.matchPlayerInfo[action.payload],
                score: state.game.gameType
              }
            }
          }
        };
      case UPDATE_AVERAGES:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                averages: {
                  ...state.game.matchPlayerInfo[action.payload.playerName].averages,
                  overall: action.payload.newOverallAverage,
                  [action.payload.gamePeriod] : action.payload.newGamePeriodAvg
                }
              }
            }
          }
        };
      case INCREMENT_TOTAL_THROW:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                totalThrow: {
                  ...state.game.matchPlayerInfo[action.payload.playerName].totalThrow,
                  darts: state.game.matchPlayerInfo[action.payload.playerName].totalThrow.darts + action.payload.dartNumber,
                  rounds: state.game.matchPlayerInfo[action.payload.playerName].totalThrow.rounds + 1
                },
                [action.payload.gamePeriod]: {
                  ...state.game.matchPlayerInfo[action.payload.playerName][action.payload.gamePeriod],
                  darts: state.game.matchPlayerInfo[action.payload.playerName][action.payload.gamePeriod].darts + action.payload.dartNumber,
                  rounds: state.game.matchPlayerInfo[action.payload.playerName][action.payload.gamePeriod].rounds +1
                }
              }
            }
          }
        };
      case UPDATE_BEST_THREE_DARTS:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                bestThreeDarts: action.payload.score,
              }
            }
          }
        };
      case UPDATE_CHECKOUT_SCORE:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                checkoutScores: action.payload.checkoutScores,
              }
            }
          }
        };
      case UPDATE_SECTION_HIT:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                hit: action.payload.hit,
              }
            }
          }
  
        };
      case UPDATE_SCORE_RANGES:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                scoreRanges: action.payload.scoreRanges,
              }
            }
          }
        };
      case UPDATE_DOUBLE_OUT:
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                doubleOut: action.payload.doubleOut,
              }
            }
          }
        };
      case INCREMENT_LEG_WON: 
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                currentSetLegWon: state.game.matchPlayerInfo[action.payload.playerName].currentSetLegWon + 1,
              }
            }
          }
        };
      case INCREMENT_SET_WON: 
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload.playerName]: {
                ...state.game.matchPlayerInfo[action.payload.playerName],
                setWon: state.game.matchPlayerInfo[action.payload.playerName].setWon + 1,
              }
            }
          }
        };
      case RESET_PLAYER_LEG: 
        return {
          ...state,
          game: {
            ...state.game,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload]: {
                ...state.game.matchPlayerInfo[action.payload],
                currentSetLegWon: 0
              }
            }
          }
        };
      case CHANGE_CURRENT_PLAYER: 
        return {
          ...state,
          game: {
            ...state.game,
            currentPlayerTurn: action.payload
          }
        };
      case CHANGE_STARTING_PLAYER_SET:
        return {
          ...state,
          game: {
            ...state.game,
            currentPlayerTurn: action.payload,
            startingPlayerLeg: action.payload,
            startingPlayerSet: action.payload
          }
        };
      case CHANGE_STARTING_PLAYER_LEG:
        return {
          ...state,
          game: {
            ...state.game,
            currentPlayerTurn: action.payload,
            startingPlayerLeg: action.payload
          }
        };
      case GAME_HAS_WINNER:
        return {
          ...state,
          game: {
            ...state.game,
            hasWinner: true,
            matchPlayerInfo: {
              ...state.game.matchPlayerInfo,
              [action.payload]: {
                ...state.game.matchPlayerInfo[action.payload],
                hasWongame: true
              }
            }
          }
        };
      case RETURN_PREV_PLAYER:
        return {
          ...state,
          game: action.payload,
        };
      case SET_LOADING:
        return {
          ...state,
          loading: {...state.loading, [action.payload.eventName]: action.payload.setTo}
        };
      case THROW_ERROR:
        return {
          ...state,
          error: {
            message: action.payload.message,
            errorFor: action.payload.errorFor
          }
        };
        case RESET_ERROR: 
          return {
            ...state,
            error: null
          };
      default:
        return {
          ...state
        }
    }
  };
  
  export default X01Reducer;
  