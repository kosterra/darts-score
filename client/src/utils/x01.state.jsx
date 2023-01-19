import React, { Fragment, useEffect, useReducer } from 'react';
import { useParams } from "react-router-dom";
import { toast } from 'react-toastify';

import X01Context from './x01.context';
import X01Reducer from './x01.reducer';
import {
  FETCH_GAME_SUCCESS,
  FETCH_PLAYERS_SUCCESS,
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
  RETURN_PREV_PLAYER
} from './constants';

import X01Models from '../models/x01.models';
import X01Service from '../services/x01.service';
import ReturnToPreviousPlayer from './return.to.previous.player';
import PlayerService from '../services/player.service';

const X01State = props => {
  const { id } = useParams();

  const initialState = {
    game: {},
    players: [],
    loading: {
      initGameLoading: false,
      validateThrow: false
    }
  };

  const [state, dispatch] = useReducer(X01Reducer, initialState);

  // fetch a x01 game from the API
  useEffect(() => {
    async function fetchX01() {
      let x01 = await X01Service.loadX01(id);
      dispatch({type: FETCH_GAME_SUCCESS, payload: x01});
      return x01;
    }

    async function fetchPlayers(game) {
      let players = [];
      await Promise.all(game.players.map(async (playerId) => {
        let player = await PlayerService.getPlayer(playerId);
        players.push(player);
      }));
      dispatch({type: FETCH_PLAYERS_SUCCESS, payload: players});
    }

    fetchX01().then((game) => {
      fetchPlayers(game);
    });
  }, [id]);

  const initNewGame = gameData => {
    setLoading('initGameLoading', true);
    const data = {...state.game, ...gameData}
    dispatch({
      type: INIT_NEW_GAME,
      payload: data
    })
    setLoading('initGameLoading', false)
  }

  const resetGame = () => dispatch({
    type: RESET_GAME,
    payload: {...X01Models.GameModel}
  })

  const updateCurrentThrowManual = (score, value, index) => {
    if (state.game.gameType === score && value !== '' && validateDartValue(value)) {
        if (state.game.legInMode === 'Double In') {
          let startedInDouble = dartIsDouble(value);
          if (!startedInDouble) {
            value = '0'
          }
        } else if (state.game.legInMode === 'Master In') {
          let startedInMaster = dartIsDouble(value) || dartIsTriple(value);
          if (!startedInMaster) {
            value = '0';
          }
        }
    }

    const newCurrentThrow = state.game.currentThrow.map((dart, i) => {
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
    const newCurrentThrow = [...state.game.currentThrow];

    for(let index = 0; index < newCurrentThrow.length; index++) {
      if (state.game.gameType === score && validateDartValue(value)) {
          if (state.game.legInMode === 'Double In') {
            let startedInDouble = dartIsDouble(value);
            if (!startedInDouble) {
              value = '0'
            }
          } else if (state.game.legInMode === 'Master In') {
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
    let currentThrow = [...state.game.currentThrow];
    let roundScore = getCurrentThrowScore();
    let currentLegThrows = [...state.game.currentLegThrows,
      { 
        darts: currentThrow,
        playerId: state.game.currentPlayerTurn,
        roundScore: roundScore,
        scoreLeft: currentScore
      }];
    let hasWonLeg = false;
    let hasWonSet = false;
    let hasWonMatch = false;

    for(let i = 0; i< currentThrow.length; i++) {
      if(!validateDartValue(currentThrow[i])) {
        toast.error('One or more of your dart has an invalid value');
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
      if (state.game.legOutMode === 'Straight Out') {
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
      } else if (state.game.legOutMode === 'Double Out') {
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
      } else if (state.game.legOutMode === 'Master Out') {
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
      toast.error('You need add a value for each dart');
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
    let values = state.game.currentThrow;

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
    let values = state.game.currentThrow;

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
    let totalScore = [...state.game.currentThrow].reduce((total, dart) => {
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
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let playerId = state.game.currentPlayerTurn;
    let roundScore = getCurrentThrowScore();
    let score = playerModel.score;

    dispatch({
      type: PUSH_TO_CURRENT_LEG_THROWS,
      payload: {
        playerId,
        darts: state.game.currentThrow.filter(dart => dart.trim() !== ''),
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
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let playerId = state.game.currentPlayerTurn;
    let totalRounds = playerModel.totalThrow.rounds
    let overallAverage = playerModel.averages.overall;

    let totalCurrentScore = isBusted ? 0 : getCurrentThrowScore();

    let newOverallAverage = (overallAverage * totalRounds + totalCurrentScore) / (totalRounds +1);

    let gamePeriod = playerModel.score > 140 ? 'begMidGame' : 'endGame';
    let newGamePeriodAvg;
 
    if (gamePeriod === 'begMidGame') {
      let totalRoundsBegMid = playerModel.totalThrowBegMidGame.rounds;
      let begMidGameAvg = playerModel.averages.begMidGame;

      newGamePeriodAvg = (begMidGameAvg * totalRoundsBegMid + totalCurrentScore) / (totalRoundsBegMid + 1);
    } else {
      let totalRoundsEnd = playerModel.totalThrowEndGame.rounds;
      let endGameAvg = playerModel.averages.endGame;

      newGamePeriodAvg = (endGameAvg * totalRoundsEnd + totalCurrentScore) / (totalRoundsEnd + 1);
    } 

    dispatch({
      type: UPDATE_AVERAGES,
      payload: {
        playerId,
        newOverallAverage,
        gamePeriod,
        newGamePeriodAvg
      }
    });
  }

  const updatePlayerScore = score => {
    let playerId = state.game.currentPlayerTurn;
    dispatch({
      type: UPDATE_PLAYER_SCORE,
      payload: {
        playerId,
        score
      }
    })
  }

  const resetScores = () => {
    state.game.players.forEach(player => {
      dispatch({
        type: RESET_SCORES,
        payload: player
      })
    })
  }

  const incrementTotalThrow = () => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let playerId = state.game.currentPlayerTurn;
    let dartNumber = state.game.currentThrow.filter(dart => dart.trim() !== '').length;
    let gamePeriod = playerModel.score > 140 ? 'totalThrowBegMidGame' : 'totalThrowEndGame';
    dispatch({
      type: INCREMENT_TOTAL_THROW,
      payload: {
        playerId,
        dartNumber,
        gamePeriod
      }
    })
  }

  const updateBestThreeDart = () => {
    let score = getCurrentThrowScore();
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let playerId = state.game.currentPlayerTurn;
    if(score > playerModel.bestThreeDarts) {
      dispatch({
        type: UPDATE_BEST_THREE_DARTS,
        payload: {
          playerId,
          score
        }
      })
    }
  }

  const saveCheckoutScore = () => {
    let score = getCurrentThrowScore();
    let playerId = state.game.currentPlayerTurn;
    let checkoutScores = {...state.game.playerModels[state.game.currentPlayerTurn].checkoutScores};

    if(checkoutScores.hasOwnProperty(score)) {
      checkoutScores[score]++;
    } else {
      checkoutScores[score] = 1;
    }

    dispatch({
      type: UPDATE_CHECKOUT_SCORE,
      payload: {
        playerId,
        checkoutScores
      }
    })
  }

  const updateSectionHit = () => {
    let playerId = state.game.currentPlayerTurn;
    let hit = {...state.game.playerModels[state.game.currentPlayerTurn].hit};

    state.game.currentThrow.forEach(dart => {
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
        playerId,
        hit
      }
    })
  }

  const updateScoreRanges = (busted = false) => {
    let playerId = state.game.currentPlayerTurn;
    let score = getCurrentThrowScore();
    let scoreRanges = {...state.game.playerModels[state.game.currentPlayerTurn].scoreRanges};

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
        playerId,
        scoreRanges
      }
    })
  }

  const couldDoubleOut = () => {
    let playerId = state.game.currentPlayerTurn;
    let darts = [...state.game.currentThrow].filter(dart => dart.trim() !== '');
    let doubleOut = {...state.game.playerModels[state.game.currentPlayerTurn].doubleOut};
    let currentScore = state.game.playerModels[state.game.currentPlayerTurn].score;
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
        playerId,
        doubleOut
      }
    })
  }

  const incrementLegWon = () => {
    let playerId = state.game.currentPlayerTurn;
    dispatch({
      type: INCREMENT_LEG_WON,
      payload: {
        playerId
      } 
    })
  }

  const incrementSetWon = () => {
    let playerId = state.game.currentPlayerTurn;
    dispatch({
      type: INCREMENT_SET_WON,
      payload: {
        playerId
      } 
    })
  }

  const resetPlayersLegs = () => {
    state.game.players.forEach(playerModel => {
      dispatch({
        type: RESET_PLAYER_LEG,
        payload: playerModel
      })
    })
  }

  const checkIfHasWonSet = () => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let currentLegWon = playerModel.currentSetLegWon;
    let legsBySet = state.game.legMode === 'Best of' ? Math.round(state.game.numberOfLegs / 2) : state.game.numberOfLegs;
    if (currentLegWon + 1 === legsBySet) {
      return true;
    }
    return false;
  }

  const checkIfHasWonMatch = () => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let currentSetWon = playerModel.setWon;
    let setsToWin = state.game.setMode === 'Best of' ? Math.round(state.game.numberOfSets / 2) : state.game.numberOfSets;
    if (currentSetWon + 1 === setsToWin) {
      return true;
    }
    return false;
  }

  const manageCurrentPlayerChange = (hasWonLeg, hasWonSet) => {
    let currentPlayerIndex = state.game.players.indexOf(state.game.currentPlayerTurn);
    let startingPlayerSetIndex = state.game.players.indexOf(state.game.startingPlayerSet);
    let startingPlayerLegIndex = state.game.players.indexOf(state.game.startingPlayerLeg);
    
    if(!hasWonLeg) {
      let nextPlayer = currentPlayerIndex < state.game.players.length -1 ?
            state.game.players[currentPlayerIndex + 1] : state.game.players[0];
      dispatch({
        type: CHANGE_CURRENT_PLAYER,
        payload: nextPlayer
      });
    } else if (hasWonSet) {
      let newStartingPlayerSet = startingPlayerSetIndex < state.game.players.length -1 ?
            state.game.players[startingPlayerSetIndex + 1] : state.game.players[0];
      dispatch({
        type: CHANGE_STARTING_PLAYER_SET,
        payload: newStartingPlayerSet
      });
    } else if (hasWonLeg) {
      let newStartingPlayerLeg = startingPlayerLegIndex < state.game.players.length -1 ?
            state.game.players[startingPlayerLegIndex + 1] : state.game.players[0];
      dispatch({
        type: CHANGE_STARTING_PLAYER_LEG,
        payload: newStartingPlayerLeg
      });
    }
  }

  const gameHasWinner = () => {
    let playerId = state.game.currentPlayerTurn;
    dispatch({
      type: GAME_HAS_WINNER,
      payload: playerId
    })
  }

  const onClickReturnToPreviousPlayer = () => {
    if(!state.game.currentLegThrows.length) return;
    let newMatchData = ReturnToPreviousPlayer(state.game);
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

  return (
    <Fragment>
        <X01Context.Provider
          value={{
            game: state.game,
            players: state.players,
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
            onClickReturnToPreviousPlayer
          }}
        >
          {props.children}
        </X01Context.Provider>
    </Fragment>
  );
};

export default X01State;
