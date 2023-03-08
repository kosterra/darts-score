const X01ReturnToPreviousPlayer = game => {
  let prevThrowInfo = game.currentLegThrows.pop();
  let prevScore = getCurrentThrowScore(prevThrowInfo.darts);

  changeCurrentPlayer(game);
  game.currentThrow = prevThrowInfo.darts;
  game.playerModels[prevThrowInfo.playerId].score += prevScore;
  updateAverages(game, prevThrowInfo.playerId, prevThrowInfo.darts);
  updateTotalThrow(
    game,
    prevThrowInfo.playerId, 
    prevThrowInfo.darts.length
  );
  
  updateHit(game.playerModels[prevThrowInfo.playerId], prevThrowInfo.darts);
  updateScoreRange(game, prevThrowInfo.playerId, prevScore);
  updateBestThreeDarts(game, prevThrowInfo.playerId);

  if (game.playerModels[prevThrowInfo.playerId].score - prevScore <= 50) {
    updateCheckout(game, prevThrowInfo.playerId, Object.assign({}, prevThrowInfo.darts));
  }

  return game;
}

const changeCurrentPlayer = game => {
  let index = game.players.indexOf(game.currentPlayerTurn);
  if (index === 0) {
    game.currentPlayerTurn = game.players[game.players.length - 1];
  } else {
    game.currentPlayerTurn = game.players[index - 1];
  }
}

const getCurrentThrowScore = darts => {
  let totalScore = darts.reduce((total, dart) => {

    if(Number(dart) === 0 || dart === '') return total;

    let score = Number(dart.slice(1));

    if(/t/i.test(dart[0])) score *= 3;
    if(/d/i.test(dart[0])) score *= 2;
    return total +=score;
  }, 0 );

  return  totalScore;
}

const updateTotalThrow = (game, playerId, dartsNbr) => {
  let score = game.playerModels[playerId].score;
  let gamePeriod = score > 140 ? 'begMidGame' : 'endGame';

  let totalThrow = game.playerModels[playerId].totalThrow;
  totalThrow.game.rounds--;
  totalThrow.game.darts -= dartsNbr;
  totalThrow['set-' + game.currentSet].rounds--;
  totalThrow['set-' + game.currentSet].darts -= dartsNbr;
  totalThrow['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds--;
  totalThrow['set-' + game.currentSet]['leg-' + game.currentSetLeg].darts -= dartsNbr;
  game.playerModels[playerId].totalThrow = totalThrow;

  if (gamePeriod === 'begMidGame') {
    let totalThrowBegMidGame = game.playerModels[playerId].totalThrowBegMidGame;
    totalThrowBegMidGame.game.rounds--;
    totalThrowBegMidGame.game.darts -= dartsNbr;
    totalThrowBegMidGame['set-' + game.currentSet].rounds--;
    totalThrowBegMidGame['set-' + game.currentSet].darts -= dartsNbr;
    totalThrowBegMidGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds--;
    totalThrowBegMidGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].darts -= dartsNbr;
    game.playerModels[playerId].totalThrowBegMidGame = totalThrowBegMidGame;

  }

  if (gamePeriod === 'endGame') {
    let totalThrowEndGame = game.playerModels[playerId].totalThrowEndGame;
    totalThrowEndGame.game.rounds--;
    totalThrowEndGame.game.darts -= dartsNbr;
    totalThrowEndGame['set-' + game.currentSet].rounds--;
    totalThrowEndGame['set-' + game.currentSet].darts -= dartsNbr;
    totalThrowEndGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds--;
    totalThrowEndGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].darts -= dartsNbr;
    game.playerModels[playerId].totalThrowEndGame = totalThrowEndGame;
  }
}

const updateHit = (playerModel, darts) => {
  darts.forEach(dart => {
    if (Number(dart) === 0)  dart = 'Missed';
    playerModel.hit[dart] > 0 && playerModel.hit[dart]--;
    playerModel.hit[dart] === 0 && delete playerModel.hit[dart];
  })
}

const updateScoreRange = (game, playerId, score) => {
  let scoreRanges = game.playerModels[playerId].scoreRanges

  if (score === 0 || score === 180) {
    score === 0 && scoreRanges.game['ZERO']--;
    score === 0 && scoreRanges['set-' + game.currentSet]['ZERO']--;
    score === 0 && scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg]['ZERO']--;
    score === 180 && scoreRanges.game['180']--;
    score === 180 && scoreRanges['set-' + game.currentSet]['180']--;
    score === 180 && scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg]['180']--;
    
    scoreRanges.game['ZERO'] === 0 && delete scoreRanges.game['ZERO'];
    scoreRanges['set-' + game.currentSet]['ZERO'] === 0 && delete scoreRanges['set-' + game.currentSet]['ZERO'];
    scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg]['ZERO'] === 0 && delete scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg]['ZERO'];
    scoreRanges.game['180'] === 0 && delete scoreRanges.game['180'];
    scoreRanges['set-' + game.currentSet]['180'] === 0 && delete scoreRanges['set-' + game.currentSet]['180'];
    scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg]['180'] === 0 && delete scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg]['180'];
  } else {
    let rangesGame = Object.keys(scoreRanges.game);
    let rangesSet = Object.keys(scoreRanges['set-' + game.currentSet]);
    let rangesLeg = Object.keys(scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg]);

    for (let i = 0; i < rangesGame.length; i++) {
      let rangeArr = rangesGame[i].split('-');
      if (score >= rangeArr[0] && score <= rangeArr[1]) {
        scoreRanges.game[rangesGame[i]]--;
        scoreRanges.game[rangesGame[i]] === 0 && delete scoreRanges.game[rangesGame[i]];
      }
    }

    for (let i = 0; i < rangesSet.length; i++) {
      let rangeArr = rangesSet[i].split('-');
      if (score >= rangeArr[0] && score <= rangeArr[1]) {
        scoreRanges['set-' + game.currentSet][rangesSet[i]]--;
        scoreRanges['set-' + game.currentSet][rangesSet[i]] === 0 && delete scoreRanges['set-' + game.currentSet][rangesSet[i]];
      }
    }

    for (let i = 0; i < rangesLeg.length; i++) {
      let rangeArr = rangesLeg[i].split('-');
      if (score >= rangeArr[0] && score <= rangeArr[1]) {
        scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg][rangesLeg[i]]--;
        scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg][rangesLeg[i]] === 0 && delete scoreRanges['set-' + game.currentSet]['leg-' + game.currentSetLeg][rangesLeg[i]];
      }
    }
  }

  game.playerModels[playerId].scoreRanges = scoreRanges;
}

const updateBestThreeDarts = (game, playerId) => {
  let bestThreeDarts = game.playerModels[playerId].bestThreeDarts;

  bestThreeDarts.game.value = 0;
  bestThreeDarts['set-' + game.currentSet].value = 0;
  bestThreeDarts['set-' + game.currentSet]['leg-' + game.currentSetLeg].value = 0;

  game.currentLegThrows.forEach(round => {
    if (round.playerId === playerId) {
      let currentBestScoreGame = bestThreeDarts.game.value;
      let currentBestScoreSet = bestThreeDarts['set-' + game.currentSet].value;
      let currentBestScoreLeg = bestThreeDarts['set-' + game.currentSet]['leg-' + game.currentSetLeg].value;

      bestThreeDarts.game.value = Math.max(currentBestScoreGame, getCurrentThrowScore(round.darts));
      bestThreeDarts['set-' + game.currentSet].value = Math.max(currentBestScoreSet, getCurrentThrowScore(round.darts));
      bestThreeDarts['set-' + game.currentSet]['leg-' + game.currentSetLeg].value = Math.max(currentBestScoreLeg, getCurrentThrowScore(round.darts));
    }
  });

  let allSetsThrows = game.allSetsThrows;

  if (allSetsThrows) {
    for (let s = 1; s <= game.currentSet; s++) {
      for (let l = 1; l <= game.legsPlayed; l++) {
        let leg = ((allSetsThrows['set-' + s] || {})['leg-' + l] || []);
        leg.forEach(round => {
          if (round.playerId && round.playerId === playerId) {
            let bestScoreGame = Math.max(round.roundScore || 0, bestThreeDarts.game.value);
            bestThreeDarts.game.value = Math.max(bestScoreGame, getCurrentThrowScore(round.darts));

            if (game.currentSet === s) {
              let bestScoreSet = Math.max(round.roundScore || 0, bestThreeDarts['set-' + s].value);
              bestThreeDarts['set-' + s].value = Math.max(bestScoreSet, getCurrentThrowScore(round.darts));

              if (game.currentSetLeg === l) {
                let bestScoreLeg = Math.max(round.roundScore || 0, bestThreeDarts['set-' + s]['leg-' + l].value);
                bestThreeDarts['set-' + s]['leg-' + l].value = Math.max(bestScoreLeg, getCurrentThrowScore(round.darts));
              }
            }
          }
        });
      }
    }
  }
  game.playerModels[playerId].bestThreeDarts = bestThreeDarts;
}

const updateCheckout = (game, playerId, darts) => {
  let checkout = game.playerModels[playerId].checkout;
  let prevScore = game.playerModels[playerId].score - getCurrentThrowScore(darts);

  darts.reverse().forEach(dart => {
    let dartArr = [dart]
    prevScore =  prevScore + getCurrentThrowScore(dartArr);
    if ((prevScore % 2 === 0 && prevScore <= 40) || prevScore === 50) {
      checkout['game'].miss--;
      checkout['game'].total--;
      checkout['set-' + game.currentSet].miss--;
      checkout['set-' + game.currentSet].total--;
      checkout['set-' + game.currentSet]['leg-' + game.currentSetLeg].miss--;
      checkout['set-' + game.currentSet]['leg-' + game.currentSetLeg].total--;
      checkout['sections'][prevScore / 2].miss--;
      checkout['sections'][prevScore / 2].total--;
      checkout['sections'][prevScore / 2].total === 0 && delete checkout['sections'][prevScore / 2];
    }
  });

  game.playerModels[playerId].checkout = checkout;
}

const updateAverages = (game, playerId, darts) => {
  let playerModel = game.playerModels[playerId]

  if (playerModel.totalThrow.game.rounds === 1) {
    playerModel.averages = {
      game: {
        overall: 0,
        begMidGame: 0,
        endGame: 0,
      }
    }
  } else {
    let score = getCurrentThrowScore(darts);

    let gameOverallAvg = playerModel.averages.game.overall;
    let setOverallAvg = playerModel.averages['set-' + game.currentSet].overall;
    let legOverallAvg = playerModel.averages['set-' + game.currentSet]['leg-' + game.currentSetLeg].overall;
    let totalRoundsGame = playerModel.totalThrow.game.rounds;
    let totalRoundsSet = playerModel.totalThrow['set-' + game.currentSet].rounds;
    let totalRoundsLeg = playerModel.totalThrow['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds;

    let totalGameScore = gameOverallAvg * totalRoundsGame;
    let totalSetScore = setOverallAvg * totalRoundsSet;
    let totalLegScore = legOverallAvg * totalRoundsLeg;

    playerModel.averages.game.overall = (totalGameScore - score) / (totalRoundsGame - 1);
    playerModel.averages['set-' + game.currentSet].overall = (totalSetScore - score) / (totalRoundsSet - 1);
    playerModel.averages['set-' + game.currentSet]['leg-' + game.currentSetLeg].overall = (totalLegScore - score) / (totalRoundsLeg - 1);

    let gamePeriod = playerModel.score > 140 ? 'begMidGame' : 'endGame';
 
    if (gamePeriod === 'begMidGame') {
      // New average for the game
      let totalScoreBegMidGame = playerModel.averages.game.begMidGame * playerModel.totalThrowBegMidGame.game.rounds;
      playerModel.averages.game.begMidGame = (totalScoreBegMidGame - score) / (playerModel.totalThrowBegMidGame.game.rounds - 1);

      // New average for the current set
      let totalScoreBegMidSet = playerModel.averages['set-' + game.currentSet].begMidSet * playerModel.totalThrowBegMidGame['set-' + game.currentSet].rounds;
      playerModel.averages['set-' + game.currentSet].begMidSet = (totalScoreBegMidSet - score) / (playerModel.totalThrowBegMidGame['set-' + game.currentSet].rounds - 1);
      
      // New average for the current leg
      let totalScoreBegMidLeg = playerModel.averages['set-' + game.currentSet]['leg-' + game.currentSetLeg].begMidLeg * playerModel.totalThrowBegMidGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds;
      playerModel.averages['set-' + game.currentSet]['leg-' + game.currentSetLeg].begMidLeg = (totalScoreBegMidLeg - score) / (playerModel.totalThrowBegMidGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds - 1);
    } else {
      // New average for the game
      let totalScoreEndGame = playerModel.averages.game.endGame * playerModel.totalThrowEndGame.game.rounds;
      playerModel.averages.game.endGame = (totalScoreEndGame - score) / (playerModel.totalThrowEndGame.game.rounds - 1);

      // New average for the current set
      let totalScoreEndSet = playerModel.averages['set-' + game.currentSet].endSet * playerModel.totalThrowEndGame['set-' + game.currentSet].rounds;
      playerModel.averages['set-' + game.currentSet].endSet = (totalScoreEndSet - score) / (playerModel.totalThrowEndGame['set-' + game.currentSet].rounds - 1);
      
      // New average for the current leg
      let totalScoreEndLeg = playerModel.averages['set-' + game.currentSet]['leg-' + game.currentSetLeg].endLeg * playerModel.totalThrowEndGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds;
      playerModel.averages['set-' + game.currentSet]['leg-' + game.currentSetLeg].endLeg = (totalScoreEndLeg - score) / (playerModel.totalThrowEndGame['set-' + game.currentSet]['leg-' + game.currentSetLeg].rounds - 1);
    }
  }
}


export default X01ReturnToPreviousPlayer;