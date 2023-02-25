import React, { Fragment, useEffect, useReducer } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { toast } from 'react-toastify';

import X01Context from './x01.context';
import X01Reducer from './x01.reducer';
import {
  FETCH_GAME_SUCCESS,
  FETCH_PLAYERS_SUCCESS,
  SET_LOADING,
  UPDATE_CURRENT_THROW,
  RESET_CURRENT_THROW,
  SAVE_ALL_SETS_THROWS,
  SAVE_CURRENT_LEG_THROWS,
  RESET_CURRENT_LEG_THROWS,
  PUSH_TO_CURRENT_LEG_THROWS,
  UPDATE_PLAYER_SCORE,
  RESET_SCORES,
  UPDATE_AVERAGES,
  UPDATE_TOTAL_THROW,
  UPDATE_TOTAL_THROW_BEG_MID_GAME,
  UPDATE_TOTAL_THROW_END_GAME,
  UPDATE_BEST_THREE_DARTS,
  UPDATE_CHECKOUT_SCORE,
  UPDATE_SECTION_HIT,
  UPDATE_SCORE_RANGES,
  UPDATE_CHECKOUT,
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
  RETURN_PREV_PLAYER
} from './constants';

import X01Service from '../services/x01.service';
import X01ReturnToPreviousPlayer from './x01.return.to.previous.player';
import PlayerService from '../services/player.service';

const X01State = props => {
  const { id } = useParams();

  const navigate = useNavigate();

  const initialState = {
    game: {},
    players: [],
    loading: {
      initGameLoading: true,
      validateThrow: false
    }
  };

  const [state, dispatch] = useReducer(X01Reducer, initialState);

  // fetch a x01 game from the API
  useEffect(() => {
    setLoading('initGameLoading', true);
    async function fetchX01() {
      try {
        let x01 = await X01Service.loadX01(id);
        dispatch({type: FETCH_GAME_SUCCESS, payload: x01});
        return x01;
      } catch (error) {
        throw new Error(error);
      }
    }

    async function fetchPlayers(game) {
      try {
        let players = [];
        await Promise.all(game.players.map(async (playerId) => {
          let player = await PlayerService.getPlayer(playerId);
          players.push(player);
        }));
        dispatch({type: FETCH_PLAYERS_SUCCESS, payload: players});
      } catch (error) {
        throw new Error(error);
      }
    }

    fetchX01().then((game) => {
      fetchPlayers(game).then(() => {
        setLoading('initGameLoading', false);
      });
    }).catch(error => {
      toast.error('Failed to load X01 game. ' + error.message);
      navigate("/", { replace: true });
    });
  }, [id, navigate]);

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

    let roundScore = getCurrentThrowScore();
    let currentLegThrows = [...state.game.currentLegThrows,
      { 
        darts: currentThrow,
        playerId: state.game.currentPlayerTurn,
        roundScore: roundScore,
        scoreLeft: currentScore
      }];

    let hasBusted = checkIfHasBusted(currentScore)
    let hasWonLeg = false;
    let hasWonSet = false;
    let hasWonGame = false;

    if (hasBusted) {
      playerBustedUpdateState();
    } else if (currentScore === 0) {
      saveCurrentLegThrows(currentLegThrows)
      saveCheckoutScore();
      playerUpdateStat(currentScore);
      
      hasWonLeg = true;
      incrementLegsPlayed();
      incrementLegsWon();

      hasWonSet = checkIfHasWonSet();
      if (hasWonSet) {
        hasWonGame = checkIfHasWonGame();
        !hasWonGame && incrementCurrentSet();
        incrementSetsPlayed();
        incrementSetsWon();
        resetPlayersLegs();
      } else {
        incrementCurrentSetLeg();
      }
      saveAllSetsThrows(currentLegThrows);
      resetCurrentLegThrows();
    } else {
      playerUpdateStat(currentScore);
    }
    
    updateBestThreeDart();
    updateSectionHit();
    couldCheckout();

    !hasWonLeg && pushCurrentThrowToCurrentLegThrow();
    resetCurrentThrow();
    hasWonLeg && !hasWonGame && resetScores();

    if (hasWonGame) {
      gameHasWinner();
      setLoading('validateThrow', false);
      return
    }

    manageCurrentPlayerChange(hasWonLeg, hasWonSet);

    setLoading('validateThrow', false);
  }

  const checkIfHasBusted = (currentScore) => {
    let hasBusted = currentScore < 0;

    if (!hasBusted) {
      if (state.game.legOutMode === 'Double Out') {
        hasBusted = currentScore === 1 || (currentScore === 0 && !lastDartIsDouble());
      } else if (state.game.legOutMode === 'Master Out') {
        hasBusted = currentScore === 1 || (currentScore === 0 && !lastDartIsDouble() && !lastDartIsTriple());
      }
    }

    return hasBusted;
  }

  const playerUpdateStat = (currentScore) => {
    updateTotalThrow();
    updateTotalThrowBegMidGame();
    updateTotalThrowEndGame();
    calculateAverage();
    updateScoreRanges(); 
    updatePlayerScore(currentScore);

  }

  const playerBustedUpdateState = () => {
    updateTotalThrow();
    updateTotalThrowBegMidGame();
    updateTotalThrowEndGame();
    calculateAverage(true);
    updateScoreRanges(true); 
  }

  const validateDartValue = dart => {

    if(Number(dart) === 0 || dart === '') {
      return true;
    }

    if(/^[SDT]\d{1,2}$/i.test(dart) ) {

      let score = Number(dart.slice(1));
      if((score >= 1 && score <= 20) || /[SD]25/i.test(dart)) {
        return true
      };
      
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

    if(currentScore === 1 || currentScore === 0) {
      return true;
    }

    return true;
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

      if (!dartIsValid) return total += 0;

      if (Number(dart) === 0 || dart === '') return total +=0;

      let score = Number(dart.slice(1));
        if ((score >=1 && score <=20) || /[SD]25/i.test(dart)) {
          if (/t/i.test(dart[0])) score *= 3;
          if (/d/i.test(dart[0])) score *= 2;
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

  const saveAllSetsThrows = (currentLegThrows) => {
    let allSetsThrows = state.game.allSetsThrows ? state.game.allSetsThrows : {};
    if (!allSetsThrows[state.game.currentSet]) {
      allSetsThrows[state.game.currentSet] = {};
    }
    allSetsThrows[state.game.currentSet][state.game.currentSetLeg] = currentLegThrows;

    dispatch({
      type: SAVE_ALL_SETS_THROWS,
      payload: allSetsThrows
    })
  }

  const resetCurrentThrow = () => dispatch({type: RESET_CURRENT_THROW});

  const resetCurrentLegThrows = () => dispatch({type: RESET_CURRENT_LEG_THROWS});

  const calculateAverage = (isBusted = false) => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let playerId = state.game.currentPlayerTurn;
    
    let averages = playerModel.averages;

    if (!averages.hasOwnProperty('game')) {
      averages['game'] = {
        overall: 0,
        begMidGame: 0,
        endGame: 0
      };
    }

    if (!averages.hasOwnProperty('set-' + state.game.currentSet)) {
      averages['set-' + state.game.currentSet] = {
        overall: 0,
        begMidSet: 0,
        endSet: 0
      };
    }
    
    if (!averages['set-' + state.game.currentSet].hasOwnProperty('leg-' + state.game.currentSetLeg)) {
      averages['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg] = {
        overall: 0,
        begMidLeg: 0,
        endLeg: 0
      };
    }

    let totalCurrentScore = isBusted ? 0 : getCurrentThrowScore();
    let gameOverallAvg = playerModel.averages.game.overall;
    let setOverallAvg = playerModel.averages['set-' + state.game.currentSet].overall;
    let legOverallAvg = playerModel.averages['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].overall;
    let totalRoundsGame = playerModel.totalThrow.game.rounds - 1;
    let totalRoundsSet = playerModel.totalThrow['set-' + state.game.currentSet].rounds - 1;
    let totalRoundsLeg = playerModel.totalThrow['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].rounds - 1;

    averages.game.overall = (gameOverallAvg * totalRoundsGame + totalCurrentScore) / (totalRoundsGame + 1);
    averages['set-' + state.game.currentSet].overall = (setOverallAvg  * totalRoundsSet + totalCurrentScore) / (totalRoundsSet + 1);
    averages['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].overall = (legOverallAvg * totalRoundsLeg + totalCurrentScore) / (totalRoundsLeg + 1);

    let gamePeriod = playerModel.score > 140 ? 'begMidGame' : 'endGame';
 
    if (gamePeriod === 'begMidGame') {
      // New average for the game
      let totalRoundsGameBegMid = playerModel.totalThrowBegMidGame.game.rounds - 1;
      let begMidGameAvg = playerModel.averages.game.begMidGame;

      averages.game.begMidGame = (begMidGameAvg * totalRoundsGameBegMid + totalCurrentScore) / (totalRoundsGameBegMid + 1);

      // New average for the current set
      let totalRoundsSetBegMid = playerModel.totalThrowBegMidGame['set-' + state.game.currentSet].rounds - 1;
      let begMidSetAvg = playerModel.averages['set-' + state.game.currentSet].begMidSet;

      averages['set-' + state.game.currentSet].begMidSet = (begMidSetAvg * totalRoundsSetBegMid + totalCurrentScore) / (totalRoundsSetBegMid + 1);

      // New average for the current leg

      let totalRoundsLegBegMid = playerModel.totalThrowBegMidGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].rounds - 1;
      let begMidLegAvg = playerModel.averages['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].begMidLeg;

      averages['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].begMidLeg = (begMidLegAvg * totalRoundsLegBegMid + totalCurrentScore) / (totalRoundsLegBegMid + 1);
    } else {
      // New average for the game
      let totalRoundsGameEnd = playerModel.totalThrowEndGame.game.rounds - 1;
      let endGameAvg = playerModel.averages.game.endGame;

      averages.game.endGame = (endGameAvg * totalRoundsGameEnd + totalCurrentScore) / (totalRoundsGameEnd + 1);

      // New average for the current set
      let totalRoundsSetEnd = playerModel.totalThrowEndGame['set-' + state.game.currentSet].rounds - 1;
      let endSetAvg = playerModel.averages['set-' + state.game.currentSet].endSet;

      averages['set-' + state.game.currentSet].endSet = (endSetAvg * totalRoundsSetEnd + totalCurrentScore) / (totalRoundsSetEnd + 1);

      // New average for the current leg

      let totalRoundsLegEnd = playerModel.totalThrowEndGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].rounds - 1;
      let endLegAvg = playerModel.averages['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].endLeg;

      averages['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].endLeg = (endLegAvg * totalRoundsLegEnd + totalCurrentScore) / (totalRoundsLegEnd + 1);
    }

    dispatch({
      type: UPDATE_AVERAGES,
      payload: {
        playerId,
        averages
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

  const updateTotalThrow = () => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let totalThrow = playerModel.totalThrow;
    let dartNumber = state.game.currentThrow.filter(dart => dart.trim() !== '').length;

    if (!totalThrow.hasOwnProperty('game')) {
      totalThrow['game'] = {
        darts: 0,
        rounds: 0
      };
    }

    if (!totalThrow.hasOwnProperty('set-' + state.game.currentSet)) {
      totalThrow['set-' + state.game.currentSet] = {
        darts: 0,
        rounds: 0
      };
    }
    
    if (!totalThrow['set-' + state.game.currentSet].hasOwnProperty('leg-' + state.game.currentSetLeg)) {
      totalThrow['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg] = {
        darts: 0,
        rounds: 0
      };
    }

    totalThrow.game.darts += dartNumber;
    totalThrow.game.rounds++;
    totalThrow['set-' + state.game.currentSet].darts += dartNumber;
    totalThrow['set-' + state.game.currentSet].rounds++;
    totalThrow['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].darts += dartNumber;
    totalThrow['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].rounds++;

    let playerId = state.game.currentPlayerTurn;

    dispatch({
      type: UPDATE_TOTAL_THROW,
      payload: {
        playerId,
        totalThrow
      }
    })
  }

  const updateTotalThrowBegMidGame = () => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];

    if (playerModel.score > 140) {
      let totalThrowBegMidGame = playerModel.totalThrowBegMidGame;
      let dartNumber = state.game.currentThrow.filter(dart => dart.trim() !== '').length;
  
      if (!totalThrowBegMidGame.hasOwnProperty('game')) {
        totalThrowBegMidGame['game'] = {
          darts: 0,
          rounds: 0
        };
      }
  
      if (!totalThrowBegMidGame.hasOwnProperty('set-' + state.game.currentSet)) {
        totalThrowBegMidGame['set-' + state.game.currentSet] = {
          darts: 0,
          rounds: 0
        };
      }
      
      if (!totalThrowBegMidGame['set-' + state.game.currentSet].hasOwnProperty('leg-' + state.game.currentSetLeg)) {
        totalThrowBegMidGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg] = {
          darts: 0,
          rounds: 0
        };
      }
  
      totalThrowBegMidGame.game.darts += dartNumber;
      totalThrowBegMidGame.game.rounds++;
      totalThrowBegMidGame['set-' + state.game.currentSet].darts += dartNumber;
      totalThrowBegMidGame['set-' + state.game.currentSet].rounds++;
      totalThrowBegMidGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].darts += dartNumber;
      totalThrowBegMidGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].rounds++;
  
      let playerId = state.game.currentPlayerTurn;
  
      dispatch({
        type: UPDATE_TOTAL_THROW_BEG_MID_GAME,
        payload: {
          playerId,
          totalThrowBegMidGame
        }
      })
    }
  }

  const updateTotalThrowEndGame = () => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];

    if (playerModel.score <= 140) {
      let totalThrowEndGame = playerModel.totalThrowEndGame;
      let dartNumber = state.game.currentThrow.filter(dart => dart.trim() !== '').length;
  
      if (!totalThrowEndGame.hasOwnProperty('game')) {
        totalThrowEndGame['game'] = {
          darts: 0,
          rounds: 0
        };
      }
  
      if (!totalThrowEndGame.hasOwnProperty('set-' + state.game.currentSet)) {
        totalThrowEndGame['set-' + state.game.currentSet] = {
          darts: 0,
          rounds: 0
        };
      }
      
      if (!totalThrowEndGame['set-' + state.game.currentSet].hasOwnProperty('leg-' + state.game.currentSetLeg)) {
        totalThrowEndGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg] = {
          darts: 0,
          rounds: 0
        };
      }
  
      totalThrowEndGame.game.darts += dartNumber;
      totalThrowEndGame.game.rounds++;
      totalThrowEndGame['set-' + state.game.currentSet].darts += dartNumber;
      totalThrowEndGame['set-' + state.game.currentSet].rounds++;
      totalThrowEndGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].darts += dartNumber;
      totalThrowEndGame['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].rounds++;
  
      let playerId = state.game.currentPlayerTurn;
  
      dispatch({
        type: UPDATE_TOTAL_THROW_END_GAME,
        payload: {
          playerId,
          totalThrowEndGame
        }
      })
    }
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
      if (dart.trim() !== '') {
        if (Number(dart) === 0 ) {
          if (hit.hasOwnProperty('Missed')) {
            hit.Missed++;
          } else {
            hit.Missed = 1;
          }
        } else {
          if (hit.hasOwnProperty(dart.toUpperCase())) {
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
      !scoreRanges.hasOwnProperty('game') && (scoreRanges['game'] = {});
      !scoreRanges.hasOwnProperty('set-' + state.game.currentSet) && (scoreRanges['set-' + state.game.currentSet] = {});
      !scoreRanges['set-' + state.game.currentSet].hasOwnProperty('leg-' + state.game.currentSetLeg) && (scoreRanges['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg] = {});

      if (scoreRanges['game'].hasOwnProperty(range)) {
        scoreRanges['game'][range]++
      } else {
        scoreRanges['game'][range] = 1;
      }

      if (scoreRanges['set-' + state.game.currentSet].hasOwnProperty(range)) {
        scoreRanges['set-' + state.game.currentSet][range]++
      } else {
        scoreRanges['set-' + state.game.currentSet][range] = 1;
      }

      if (scoreRanges['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].hasOwnProperty(range)) {
        scoreRanges['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg][range]++
      } else {
        scoreRanges['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg][range] = 1;
      }
    }

    if (busted) {
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

  const couldCheckout = () => {
    let playerId = state.game.currentPlayerTurn;
    let darts = [...state.game.currentThrow].filter(dart => dart.trim() !== '');
    let checkout = {...state.game.playerModels[state.game.currentPlayerTurn].checkout};
    let currentScore = state.game.playerModels[state.game.currentPlayerTurn].score;
    let scoreCurrentThrow = 0;
    let newCurrentScore = currentScore - scoreCurrentThrow;

    darts.forEach(dart => {
      let dartScore;
      if (Number(dart) === 0) {
        dartScore = 0;
      } else {
        let score = Number(dart.slice(1));
        if(/t/i.test(dart[0])) score *= 3;
        if(/d/i.test(dart[0])) score *= 2;
        dartScore = score;
    
      }

      if (!checkout.hasOwnProperty('game')) {
        checkout['game'] = {
          total: 0,
          miss: 0,
          hit: 0
        };
      }

      if (!checkout.hasOwnProperty('set-' + state.game.currentSet)) {
        checkout['set-' + state.game.currentSet] = {
          total: 0,
          miss: 0,
          hit: 0
        };
      }
      
      if (!checkout['set-' + state.game.currentSet].hasOwnProperty('leg-' + state.game.currentSetLeg)) {
        checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg] = {
          total: 0,
          miss: 0,
          hit: 0
        };
      }
      
      if (state.game.legOutMode === 'Double Out' && couldCheckoutInDouble(newCurrentScore)) {
          let possibleDoubleOut = newCurrentScore / 2;
          let hasDouble = newCurrentScore - dartScore === 0 && /d/i.test(dart[0]);


          if (!checkout.hasOwnProperty('sections')) {
            checkout['sections'] = {
              total: 0,
              miss: 0,
              hit: 0
            };
          }

          if (checkout['sections'].hasOwnProperty(possibleDoubleOut)) {
            checkout['sections'][possibleDoubleOut].total++;
            !hasDouble && checkout['sections'][possibleDoubleOut].miss++
            hasDouble && checkout['sections'][possibleDoubleOut].hit++
          } else {
            checkout['sections'][possibleDoubleOut] = {
              total: 1,
              miss: !hasDouble ? 1 : 0,
              hit: hasDouble ? 1 : 0,
            }
          }

          // Game checkout quote
          checkout['game'].total++;
          !hasDouble && checkout['game'].miss++;
          hasDouble && checkout['game'].hit++;
          checkout['set-' + state.game.currentSet].total++;

          // Per set checkout quote 
          !hasDouble && checkout['set-' + state.game.currentSet].miss++;
          hasDouble && checkout['set-' + state.game.currentSet].hit++;
          checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].total++;

          // Per leg checkout quote
          !hasDouble && checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].miss++;
          hasDouble && checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].hit++;
      } else if (state.game.legOutMode === 'Master Out'
                    && (couldCheckoutInDouble(newCurrentScore) || couldCheckoutInTriple(newCurrentScore))) {
          let hasMaster = newCurrentScore - dartScore === 0 && (/d/i.test(dart[0]) || /t/i.test(dart[0]));

          checkout['game'].total++;
          !hasMaster && checkout['game'].miss++;
          hasMaster && checkout['game'].hit++;
          checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].total++;
          !hasMaster && checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].miss++;
          hasMaster && checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].hit++;
      } else if (state.game.legOutMode === 'Straight Out'
                    && (couldCheckoutInSingle(newCurrentScore)
                    || couldCheckoutInDouble(newCurrentScore)
                    || couldCheckoutInTriple(newCurrentScore))) {
          let hasCheckout = newCurrentScore - dartScore === 0
          checkout['game'].total++;
          !hasCheckout && checkout['game'].miss++;
          hasCheckout && checkout['game'].hit++;
          checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].total++;
          !hasCheckout && checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].miss++;
          hasCheckout && checkout['set-' + state.game.currentSet]['leg-' + state.game.currentSetLeg].hit++;
      }

      dispatch({
        type: UPDATE_CHECKOUT,
        payload: {
          playerId,
          checkout
        }
      })

      newCurrentScore -= dartScore;
    });
  }

  const couldCheckoutInSingle = (score) => {
    return score <= 20 && score >= 1;
  }

  const couldCheckoutInDouble = (score) => {
    return (score <= 40 && score >= 2 && score % 2 === 0) || score === 50;
  }

  const couldCheckoutInTriple = (score) => {
    return score <= 60 && score >= 3 && score % 3 === 0;
  }

  const incrementLegsPlayed = () => {
    dispatch({
      type: INCREMENT_LEGS_PLAYED,
    })
  }

  const incrementLegsWon = () => {
    let legsWon = {...state.game.playerModels[state.game.currentPlayerTurn].legsWon};
    legsWon.game++;
    legsWon['set-' + state.game.currentSet] = legsWon['set-' + state.game.currentSet] ? legsWon['set-' + state.game.currentSet] + 1 : 1;

    let playerId = state.game.currentPlayerTurn;
    dispatch({
      type: INCREMENT_LEGS_WON,
      payload: {
        playerId,
        legsWon
      } 
    })
  }

  const incrementSetsPlayed = () => {
    dispatch({
      type: INCREMENT_SETS_PLAYED,
    })
  }

  const incrementSetsWon = () => {
    let playerId = state.game.currentPlayerTurn;
    dispatch({
      type: INCREMENT_SETS_WON,
      payload: {
        playerId
      } 
    })
  }

  const incrementCurrentSet = () => {
    dispatch({
      type: INCREMENT_CURRENT_SET,
    })
  }

  const incrementCurrentSetLeg = () => {
    dispatch({
      type: INCREMENT_CURRENT_SET_LEG,
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
    let currentLegWon = playerModel.currentSetLegsWon;
    let legsBySet = state.game.legMode === 'Best of' ? Math.round(state.game.numberOfLegs / 2) : state.game.numberOfLegs;
    if (currentLegWon + 1 === legsBySet) {
      return true;
    }
    return false;
  }

  const checkIfHasWonGame = () => {
    let playerModel = state.game.playerModels[state.game.currentPlayerTurn];
    let setsToWin = state.game.setMode === 'Best of' ? Math.round(state.game.numberOfSets / 2) : state.game.numberOfSets;
    if (playerModel.setsWon + 1 === setsToWin) {
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
    let newMatchData = X01ReturnToPreviousPlayer(state.game);
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
