import React, { useReducer } from 'react';
import GameContext from './GameContext';
import gameReducer from './GameReducer';
import {
  INIT_NEW_GAME,
  RESET_GAME,
  SET_LOADING,
  UPDATE_CURRENT_THROW,
  RESET_CURRENT_THROW,
  SAVE_CURRENT_LEG_THROWS,
  RESET_CURRENT_LEG_THROWS,
  PUSH_TO_CURRENT_LEG_THROWS,
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
  RESET_PLAYER_LEG,
  INCREMENT_SET_WON,
  CHANGE_CURRENT_PLAYER,
  CHANGE_STARTING_PLAYER_SET,
  CHANGE_STARTING_PLAYER_LEG,
  GAME_HAS_WINNER,
  RETURN_PREV_PLAYER,
  THROW_ERROR,
  RESET_ERROR
} from './Types';

import dataModels from '../models/DataModels';
import returnToPreviousPlayer from './ReturnToPreviousPlayer';


const GameState = props => {
  const initialState = {
    match: {...dataModels.matchModel},
    loading: {
      initGameLoading: false,
      validateThrow: false
    },
    error: null,
  };

  const [state, dispatch] = useReducer(gameReducer, initialState);

  const initNewGame = gameData => {
    setLoading('initGameLoading', true);
    const data = {...state.match, ...gameData}
    dispatch({
      type: INIT_NEW_GAME,
      payload: data
    })
    setLoading('initGameLoading', false)
  }

  const resetGame = () => dispatch({
    type: RESET_GAME,
    payload: {...dataModels.matchModel}
  })

  const updateCurrentThrowManual = (score, value, index) => {
    if (state.match.gameType === score && value !== '' && validateDartValue(value)) {
        if (state.match.legInMode === 'Double In') {
          let startedInDouble = dartIsDouble(value);
          if (!startedInDouble) {
            value = '0'
          }
        } else if (state.match.legInMode === 'Master In') {
          let startedInMaster = dartIsDouble(value) || dartIsTriple(value);
          if (!startedInMaster) {
            value = '0';
          }
        }
    }

    const newCurrentThrow = state.match.currentThrow.map((dart, i) => {
      if (i === index) {
        dart = value;
      }
      return dart
    });
    
    dispatch({
      type: UPDATE_CURRENT_THROW,
      payload: newCurrentThrow
    })
  }

  const updateCurrentThrowDartBoard = (score, value) => {
    const newCurrentThrow = [...state.match.currentThrow];

    for(let index = 0; index < newCurrentThrow.length; index++) {
      if (state.match.gameType === score && validateDartValue(value)) {
          if (state.match.legInMode === 'Double In') {
            let startedInDouble = dartIsDouble(value);
            if (!startedInDouble) {
              value = '0'
            }
          } else if (state.match.legInMode === 'Master In') {
            let startedInMaster = dartIsDouble(value) || dartIsTriple(value);
            if (!startedInMaster) {
              value = '0';
            }
          }
      }

      if (newCurrentThrow[index] === '') {
        newCurrentThrow[index] = value;
        break;
      }
    }

    dispatch({
      type: UPDATE_CURRENT_THROW,
      payload: newCurrentThrow
    })

  }

  const onClickValidateThrow = currentScore => {
    setLoading('validateThrow', true);
    let currentThrow = [...state.match.currentThrow];
    let roundScore = getCurrentThrowScore();
    let currentLegThrows = [...state.match.currentLegThrows,
      { 
        darts: currentThrow,
        playerName: state.match.players[state.match.currentPlayerTurn],
        roundScore: roundScore,
        scoreLeft: currentScore
      }];
    let hasWonLeg = false;
    let hasWonSet = false;
    let hasWonMatch = false;

    for(let i = 0; i< currentThrow.length; i++) {
      if(!validateDartValue(currentThrow[i])) {
        throwError("One or more of your dart has an invalid value", "throw-validation");
        setLoading('validateThrow', false);
        return
      }
    }

    let throwIsValid = validateWholeThrow(currentThrow, currentScore);
    if(!throwIsValid) {
      setLoading('validateThrow', false);
      return
    };

    if (currentScore === 1 || currentScore < 0) {
      playerBustedUpdateState()

    } else if (currentScore === 0) {
      if (state.match.legOutMode === 'Straight Out') {
        saveCurrentLegThrows(currentLegThrows)
        saveCheckoutScore();
        playerUpdateStat(currentScore);
        hasWonSet = checkIfHasWonSet();
        if (hasWonSet) {
          hasWonMatch = checkIfHasWonMatch();
          incrementSetWon();
          resetPlayersLegs();
        } else {
          incrementLegWon();
        }
        hasWonLeg = true;
        resetCurrentLegThrows();
      } else if (state.match.legOutMode === 'Double Out') {
        let finishedInDouble = lastDartIsDouble();
        
        if (finishedInDouble) {
          saveCurrentLegThrows(currentLegThrows)
          saveCheckoutScore();
          playerUpdateStat(currentScore);
          hasWonSet = checkIfHasWonSet();
          if (hasWonSet) {
            hasWonMatch = checkIfHasWonMatch();
            incrementSetWon();
            resetPlayersLegs();
          } else {
            incrementLegWon();
          }
          hasWonLeg = true;
          resetCurrentLegThrows();
        } else {
          playerBustedUpdateState()
        }
      } else if (state.match.legOutMode === 'Master Out') {
        let finishedInMaster = lastDartIsDouble() || lastDartIsTriple();
        
        if (finishedInMaster) {
          saveCurrentLegThrows(currentLegThrows)
          saveCheckoutScore();
          playerUpdateStat(currentScore);
          hasWonSet = checkIfHasWonSet();
          if (hasWonSet) {
            hasWonMatch = checkIfHasWonMatch();
            incrementSetWon();
            resetPlayersLegs();
          } else {
            incrementLegWon();
          }
          hasWonLeg = true;
          resetCurrentLegThrows();
        } else {
          playerBustedUpdateState()
        }
      }
    } else {
      playerUpdateStat(currentScore);
    }
    updateBestThreeDart();
    updateSectionHit();
    couldDoubleOut();

    !hasWonLeg && pushCurrentThrowToCurrentLegThrow();
    resetCurrentThrow();
    hasWonLeg && resetScores();

    if (hasWonMatch) {
      gameHasWinner();
      setLoading('validateThrow', false);
      return
    }

    manageCurrentPlayerChange(hasWonLeg, hasWonSet);

    setLoading('validateThrow', false);
  }

  const playerUpdateStat = (currentScore) => {
    calculateAverage();
    incrementTotalThrow();
    updateScoreRanges(); 
    updatePlayerScore(currentScore);

  }

  const playerBustedUpdateState = () => {
      calculateAverage(true);
      incrementTotalThrow();
      updateScoreRanges(true); 
  }

  const validateDartValue = dart => {

    if(Number(dart) === 0 || dart === '') return true;
    if(/^[SDT]\d{1,2}$/i.test(dart) ) {

      let score = Number(dart.slice(1));
      if((score >= 1 && score <= 20) || /[SD]25/i.test(dart)) return true;
      
    }
    return false;
  }

  const validateWholeThrow = (values, currentScore) => {
    let getWhiteSpaces = values.filter(value => value.trim() === '');

    if(
      (currentScore >  1 && getWhiteSpaces.length) ||
      values[0] === '' ||
      (values[1] === '' && values[2] !== '')
    ) {
      throwError("You need add a value for each dart", "throw-validation");
      return false;
    }

    if(currentScore === 1 || currentScore === 0) return true;

    return true
  }

  const dartIsDouble = (value) => {
    if(/^d/i.test(value)) {
      return true
    } else {
      return false
    }
  }

  const dartIsTriple = (value) => {
    if(/^t/i.test(value)) {
      return true
    } else {
      return false
    }
  }

  const lastDartIsDouble = () => {
    let values = state.match.currentThrow;

    if (values[2].trim() === '' && values[1].trim() === '') {
      
      if (/^d/i.test(values[0])) {
        return true
      } else {
        return false
      }
    }

    if (values[2].trim() === '') {
      if (/^d/i.test(values[1])) {
        return true
      } else {
        return false
      }
    }
    
    if (/^d/i.test(values[2])) {
      return true
    } else {
      return false
    }
  }

  const lastDartIsTriple = () => {
    let values = state.match.currentThrow;

    if (values[2].trim() === '' && values[1].trim() === '') {
      
      if (/^t/i.test(values[0])) {
        return true
      } else {
        return false
      }
    }

    if (values[2].trim() === '') {
      if (/^t/i.test(values[1])) {
        return true
      } else {
        return false
      }
    }

    if (/^t/i.test(values[2])) {
      return true
    } else {
      return false
    }
  }

  const getCurrentThrowScore = () => {
    let totalScore = [...state.match.currentThrow].reduce((total, dart) => {
      let dartIsValid = validateDartValue(dart);

      if(!dartIsValid) return total += 0;

      if(Number(dart) === 0 || dart === '') return total +=0;

      let score = Number(dart.slice(1));
        if((score >=1 && score <=20) || /[SD]25/i.test(dart)) {
          if(/t/i.test(dart[0])) score *= 3;
          if(/d/i.test(dart[0])) score *= 2;
          return total +=score;

        }

      return total += 0;
    }, 0 );

    return  totalScore;
  }

  const pushCurrentThrowToCurrentLegThrow = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let roundScore = getCurrentThrowScore();
    let score = state.match.matchPlayerInfo[state.match.players[state.match.currentPlayerTurn]].score;

    dispatch({
      type: PUSH_TO_CURRENT_LEG_THROWS,
      payload: {
        playerName,
        darts: state.match.currentThrow.filter(dart => dart.trim() !== ''),
        roundScore: roundScore,
        scoreLeft: score - roundScore <= 1 ? score : score - roundScore
      } 
    })
  }

  const saveCurrentLegThrows = (currentLegThrows) => {
    dispatch({
      type: SAVE_CURRENT_LEG_THROWS,
      payload: currentLegThrows
    })
  }

  const resetCurrentThrow = () => dispatch({type: RESET_CURRENT_THROW});

  const resetCurrentLegThrows = () => dispatch({type: RESET_CURRENT_LEG_THROWS});

  const calculateAverage = (isBusted = false) => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let totalRounds = state.match.matchPlayerInfo[playerName].totalThrow.rounds
    let overallAverage = state.match.matchPlayerInfo[playerName].averages.overall;

    let totalCurrentScore = isBusted ? 0 : getCurrentThrowScore();

    let newOverallAverage = (overallAverage * totalRounds + totalCurrentScore) / (totalRounds +1);

    let gamePeriod = state.match.matchPlayerInfo[playerName].score > 140 ? 'begMidGame' : 'endGame';
    let newGamePeriodAvg;
 
    if(gamePeriod === 'begMidGame') {
      let totalRoundsBegMid = state.match.matchPlayerInfo[playerName].totalThrowBegMidGame.rounds;
      let begMidGameAvg = state.match.matchPlayerInfo[playerName].averages.begMidGame;

      newGamePeriodAvg = (begMidGameAvg * totalRoundsBegMid + totalCurrentScore) / (totalRoundsBegMid + 1);
    } else {
      let totalRoundsEnd = state.match.matchPlayerInfo[playerName].totalThrowEndGame.rounds;
      let endGameAvg = state.match.matchPlayerInfo[playerName].averages.endGame;

      newGamePeriodAvg = (endGameAvg * totalRoundsEnd + totalCurrentScore) / (totalRoundsEnd + 1);
    } 

    dispatch({
      type: UPDATE_AVERAGES,
      payload: {
        playerName,
        newOverallAverage,
        gamePeriod,
        newGamePeriodAvg
      }
    });
  }

  const updatePlayerScore = score => {
    let playerName = state.match.players[state.match.currentPlayerTurn];

    dispatch({
      type: UPDATE_PLAYER_SCORE,
      payload: {
        playerName,
        score
      }
    })
  }

  const resetScores = () => {
    state.match.players.forEach(player => {
      dispatch({
        type: RESET_SCORES,
        payload: player
      })
    })
  }

  const incrementTotalThrow = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let dartNumber = state.match.currentThrow.filter(dart => dart.trim() !== '').length;
    let gamePeriod = state.match.matchPlayerInfo[playerName].score > 140 ? 'totalThrowBegMidGame' : 'totalThrowEndGame';
    dispatch({
      type: INCREMENT_TOTAL_THROW,
      payload: {
        playerName,
        dartNumber,
        gamePeriod
      }
    })
  }

  const updateBestThreeDart = () => {
    let score = getCurrentThrowScore();
    let playerName = state.match.players[state.match.currentPlayerTurn];
    if(score > state.match.matchPlayerInfo[playerName].bestThreeDarts) {
      dispatch({
        type: UPDATE_BEST_THREE_DARTS,
        payload: {
          playerName,
          score
        }
      })
    }
  }

  const saveCheckoutScore = () => {
    let score = getCurrentThrowScore();
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let checkoutScores = {...state.match.matchPlayerInfo[playerName].checkoutScores};

    if(checkoutScores.hasOwnProperty(score)) {
      checkoutScores[score]++;
    } else {
      checkoutScores[score] = 1;
    }

    dispatch({
      type: UPDATE_CHECKOUT_SCORE,
      payload: {
        playerName,
        checkoutScores
      }
    })
  }

  const updateSectionHit = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let hit = {...state.match.matchPlayerInfo[playerName].hit};

    state.match.currentThrow.forEach(dart => {
      if(dart.trim() !== '') {
        if(Number(dart) === 0 ) {
          if(hit.hasOwnProperty('Missed')) {
            hit.Missed++;
          } else {
            hit.Missed = 1;
          }
        } else {
          if(hit.hasOwnProperty(dart.toUpperCase())) {
            hit[dart.toUpperCase()]++;
          } else {
            hit[dart.toUpperCase()] = 1;
          }
        }
      }
    });

    dispatch({
      type: UPDATE_SECTION_HIT,
      payload: {
        playerName,
        hit
      }
    })
  }

  const updateScoreRanges = (busted = false) => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let score = getCurrentThrowScore();
    let scoreRanges = {...state.match.matchPlayerInfo[playerName].scoreRanges};

    function incrementRange(range) {
      if(scoreRanges.hasOwnProperty(range)) {
        scoreRanges[range]++
      } else {
        scoreRanges[range] = 1;
      }
    }

    if(busted) {
      incrementRange('Busted');
    } else if (score === 0){
      incrementRange('ZERO');
    } else if(score < 20) {
      incrementRange('1-19');
    } else if (score < 40) {
      incrementRange('20-39');
    } else if(score < 60) {
      incrementRange('40-59');
    } else if(score < 80) {
      incrementRange('60-79');
    } else if (score < 100) {
      incrementRange('80-99');
    } else if(score < 120) {
      incrementRange('100-119');
    } else if(score < 140) {
      incrementRange('120-139');
    } else if(score < 160) {
      incrementRange('140-159');
    } else if(score < 180) {
      incrementRange('160-179');
    } else {
      incrementRange('180');
    }

    dispatch({
      type: UPDATE_SCORE_RANGES,
      payload: {
        playerName,
        scoreRanges
      }
    })
  }

  const couldDoubleOut = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let darts = [...state.match.currentThrow].filter(dart => dart.trim() !== '');
    let doubleOut = {...state.match.matchPlayerInfo[playerName].doubleOut};
    let currentScore = state.match.matchPlayerInfo[playerName].score;
    let scoreCurrentThrow = 0;
    let newCurrentScore = currentScore - scoreCurrentThrow;

    darts.forEach(dart => {
      let dartScore;
      if(Number(dart) === 0 ) {
        dartScore = 0;
      } else {
        let score = Number(dart.slice(1));
        if(/t/i.test(dart[0])) score *= 3;
        if(/d/i.test(dart[0])) score *= 2;
        dartScore = score;
    
      }

      if((newCurrentScore <= 40 && newCurrentScore >= 2) || newCurrentScore === 50) {
        if(newCurrentScore % 2 === 0) {
          let possibleDoubleOut = newCurrentScore / 2;
          let hasDoubleOut = newCurrentScore - dartScore === 0 && /d/i.test(dart[0]);
          if(doubleOut.hasOwnProperty(possibleDoubleOut)) {
            doubleOut[possibleDoubleOut].total++;
            !hasDoubleOut && doubleOut[possibleDoubleOut].miss++
            hasDoubleOut && doubleOut[possibleDoubleOut].hit++
          } else {
            doubleOut[possibleDoubleOut] = {
              total: 1,
              miss: !hasDoubleOut ? 1 : 0,
              hit: hasDoubleOut ? 1 : 0,
            }
          }
        }
      }
      newCurrentScore -= dartScore;
    });

    dispatch({
      type: UPDATE_DOUBLE_OUT,
      payload: {
        playerName,
        doubleOut
      }
    })
  }

  const incrementLegWon = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    dispatch({
      type: INCREMENT_LEG_WON,
      payload: {
        playerName
      } 
    })
  }

  const incrementSetWon = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    dispatch({
      type: INCREMENT_SET_WON,
      payload: {
        playerName
      } 
    })
  }

  const resetPlayersLegs = () => {
    state.match.players.forEach(player => {
      dispatch({
        type: RESET_PLAYER_LEG,
        payload: player
      })
    })
  }

  const checkIfHasWonSet = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let currentLegWon = state.match.matchPlayerInfo[playerName].currentSetLegWon;
    let legsBySet = state.match.legMode === 'Best of' ? Math.round(state.match.numberOfLegs / 2) : state.match.numberOfLegs;
    if (currentLegWon + 1 === legsBySet) {
      return true;
    }
    return false;
  }

  const checkIfHasWonMatch = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    let currentSetWon = state.match.matchPlayerInfo[playerName].setWon;
    let setsToWin = state.match.setMode === 'Best of' ? Math.round(state.match.numberOfSets / 2) : state.match.numberOfSets;
    if (currentSetWon + 1 === setsToWin) {
      return true;
    }
    return false;
  }

  const manageCurrentPlayerChange = (hasWonLeg, hasWonSet) => {
    let currentPlayer = state.match.currentPlayerTurn;
    let startingPlayerLeg = state.match.startingPlayerLeg;
    let startingPlayerSet = state.match.startingPlayerSet;
    let numberOfPlayers = state.match.numberOfPlayers;
    if(!hasWonLeg) {
      let nextPlayer = currentPlayer + 1 >= numberOfPlayers ? 0 : currentPlayer + 1;
      dispatch({
        type: CHANGE_CURRENT_PLAYER,
        payload: nextPlayer
      });
    } else if (hasWonSet) {
      let newStartingPlayerSet = startingPlayerSet + 1 >= numberOfPlayers ? 0 : startingPlayerSet +1;
      dispatch({
        type: CHANGE_STARTING_PLAYER_SET,
        payload: newStartingPlayerSet
      });
    } else if (hasWonLeg) {
      let newStartingPlayerLeg = startingPlayerLeg + 1 >= numberOfPlayers ? 0 : startingPlayerLeg +1;
      dispatch({
        type: CHANGE_STARTING_PLAYER_LEG,
        payload: newStartingPlayerLeg
      });
    }
  }

  const gameHasWinner = () => {
    let playerName = state.match.players[state.match.currentPlayerTurn];
    dispatch({
      type: GAME_HAS_WINNER,
      payload: playerName
    })
  }

  const onClickReturnToPreviousPlayer = () => {
    if(!state.match.currentLegThrows.length) return;
    let newMatchData = returnToPreviousPlayer(state.match);
    dispatch({
      type: RETURN_PREV_PLAYER,
      payload: newMatchData
    })
  }

  const setLoading = (eventName, setTo) => dispatch({
    type: SET_LOADING,
    payload: {
      eventName,
      setTo
    }
  });

  const throwError = (message, errorFor) => {
    dispatch({
      type: THROW_ERROR,
      payload: {
        message,
        errorFor
      }, 
    });
  };

  const resetError = () => dispatch({type: RESET_ERROR});

  return (
    <GameContext.Provider
      value={{
        match: state.match,
        loading: state.loading,
        error: state.error,
        initNewGame,
        resetGame,
        resetScores,
        onClickValidateThrow,
        updateCurrentThrowManual,
        updateCurrentThrowDartBoard,
        validateDartValue,
        getCurrentThrowScore,
        onClickReturnToPreviousPlayer,
        throwError,
        resetError
      }}
    >
      {props.children}
    </GameContext.Provider>
  )
}

export default GameState;
