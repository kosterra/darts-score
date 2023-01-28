import {
    SET_LOADING,
    UPDATE_CURRENT_THROW,
    PUSH_TO_CURRENT_LEG_THROWS,
    RESET_CURRENT_THROW,
    SAVE_ALL_SETS_THROWS,
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
    INCREMENT_CURRENT_SET,
    INCREMENT_CURRENT_SET_LEG,
    INCREMENT_SETS_PLAYED,
    INCREMENT_LEGS_WON,
    INCREMENT_LEGS_PLAYED,
    INCREMENT_SETS_WON,
    RESET_PLAYER_LEG,
    CHANGE_CURRENT_PLAYER,
    CHANGE_STARTING_PLAYER_SET,
    CHANGE_STARTING_PLAYER_LEG,
    GAME_HAS_WINNER,
    RETURN_PREV_PLAYER,
    FETCH_GAME_SUCCESS,
    FETCH_PLAYERS_SUCCESS
  } from './constants';
  
  const X01Reducer = (state, action) => {
    switch (action.type) {
      case FETCH_GAME_SUCCESS: 
        return {
          ...state,
          game: {...action.payload},
        };
      case FETCH_PLAYERS_SUCCESS: 
        return {
          ...state,
          players: [...action.payload],
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
      case SAVE_ALL_SETS_THROWS:
        return {
          ...state,
          game: {
            ...state.game,
            allSetsThrows: action.payload
          }
        };
      case SAVE_CURRENT_LEG_THROWS:
        return {
          ...state,
          game: {
            ...state.game,
            allSetsThrows: {
              ...state.game.allSetsThrows,
              [state.game.currentSet] : [action.payload]
            }
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId] : {
                ...state.game.playerModels[action.payload.playerId],
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload] : {
                ...state.game.playerModels[action.payload],
                score: state.game.startingScore
              }
            }
          }
        };
      case UPDATE_AVERAGES:
        return {
          ...state,
          game: {
            ...state.game,
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
                averages: {
                  ...state.game.playerModels[action.payload.playerId].averages,
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
                totalThrow: {
                  ...state.game.playerModels[action.payload.playerId].totalThrow,
                  darts: state.game.playerModels[action.payload.playerId].totalThrow.darts + action.payload.dartNumber,
                  rounds: state.game.playerModels[action.payload.playerId].totalThrow.rounds + 1
                },
                [action.payload.gamePeriod]: {
                  ...state.game.playerModels[action.payload.playerId][action.payload.gamePeriod],
                  darts: state.game.playerModels[action.payload.playerId][action.payload.gamePeriod].darts + action.payload.dartNumber,
                  rounds: state.game.playerModels[action.payload.playerId][action.payload.gamePeriod].rounds +1
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
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
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
                doubleOut: action.payload.doubleOut,
              }
            }
          }
        };
      case INCREMENT_CURRENT_SET: 
        return {
          ...state,
          game: {
            ...state.game,
            currentSet: state.game.currentSet + 1
          }
        };
      case INCREMENT_CURRENT_SET_LEG: 
        return {
          ...state,
          game: {
            ...state.game,
            currentSetLeg: state.game.currentSetLeg + 1
          }
        };
      case INCREMENT_LEGS_PLAYED: 
        return {
          ...state,
          game: {
            ...state.game,
            legsPlayed: state.game.legsPlayed + 1
          }
        };
      case INCREMENT_LEGS_WON: 
        return {
          ...state,
          game: {
            ...state.game,
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
                legsWon: state.game.playerModels[action.payload.playerId].legsWon + 1,
                currentSetLegsWon: state.game.playerModels[action.payload.playerId].currentSetLegsWon + 1,
              }
            }
          }
        };
      case INCREMENT_SETS_PLAYED: 
        return {
          ...state,
          game: {
            ...state.game,
            setsPlayed: state.game.setsPlayed + 1
          }
        };
      case INCREMENT_SETS_WON: 
        return {
          ...state,
          game: {
            ...state.game,
            playerModels: {
              ...state.game.playerModels,
              [action.payload.playerId]: {
                ...state.game.playerModels[action.payload.playerId],
                setsWon: state.game.playerModels[action.payload.playerId].setsWon + 1,
              }
            }
          }
        };
      case RESET_PLAYER_LEG: 
        return {
          ...state,
          game: {
            ...state.game,
            currentSetLeg: 1,
            playerModels: {
              ...state.game.playerModels,
              [action.payload]: {
                ...state.game.playerModels[action.payload],
                currentSetLegsWon: 0
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
            gameIsRunning: false,
            hasWinner: true,
            currentSet: 0,
            currentSetLeg: 0,
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
        return {
          ...state,
          game: action.payload,
        };
      case SET_LOADING:
        return {
          ...state,
          loading: {...state.loading, [action.payload.eventName]: action.payload.setTo}
        };
      default:
        return {
          ...state
        }
    }
  };
  
  export default X01Reducer;
  