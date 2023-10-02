const logger = require("../models/logger.model");
const db = require("../models/db.model");
const dayjs = require("dayjs");

const X01 = db.x01;
const Cricket = db.cricket;
const { playerStatsModel } = require('../models/stats.models');

// Find a single Player with an id
exports.getPlayerStats = (req, res) => {
  logger.debug("statistics get player stats called!");
  const id = req.params.id;
  
  (async () => {
    const playerStats = await calculatePlayerStats(id);
    res.send(playerStats);
  })()
};

async function calculatePlayerStats(playerId) {
  logger.debug('calculate player stats called');
  const playerStats = JSON.parse(JSON.stringify(playerStatsModel));
  playerStats.playerId = playerId;

  const x01Games = await findX01Games(playerId);
  const cricketGames = await findCricketGames(playerId);

  playerStats.playedGames.x01 = x01Games.length;
  playerStats.playedGames.cricket = cricketGames.length;
  playerStats.playedGames.total = x01Games.length + cricketGames.length;

  const wonGamesX01 = x01Games.filter(game => game.playerModels[playerId].hasWonGame === true).length;
  const wonGamesCricket = cricketGames.filter(game => game.playerModels[playerId].hasWonGame === true).length;

  playerStats.wonGames.x01 = wonGamesX01;
  playerStats.wonGames.cricket = wonGamesCricket;
  playerStats.wonGames.total = wonGamesX01 + wonGamesCricket;

  playerStats.avg.overallX01 = calculateOverallX01Avg(x01Games, playerId);
  playerStats.avg.perGameX01 = calculatePerGameX01Avg(x01Games, playerId);
  playerStats.avg.dartsPerLegX01 = calculateDartsPerLegX01Avg(x01Games, playerId);

  playerStats.throwedDarts.x01 = getTotalDartsThrownX01(x01Games, playerId);
  playerStats.throwedPoints.x01 = getTotalPointsThrownX01(x01Games, playerId);

  playerStats.num180s = getNumberOf180sX01(x01Games, playerId);
  playerStats.num140plus = getNumberOf140plusX01(x01Games, playerId);

  playerStats.checkouts.hit = getCheckoutHitX01(x01Games, playerId);
  playerStats.checkouts.total = getCheckoutTotalX01(x01Games, playerId);
  playerStats.checkouts.highest = getHighestCheckoutX01(x01Games, playerId);

  playerStats.sectionHits = getSectionHitsX01(x01Games, playerId, playerStats.sectionHits);

  return playerStats;
}


async function findX01Games(playerId) {
  logger.debug('find x01 games called');
  let x01Games = await X01.find({ players: { $all: [playerId] }, gameIsRunning: false })
  .then(data => {
    return data;
  })
  .catch(err => {
    logger.error('Failed to find x01 games. ' + err);
  });

  return x01Games;
}

async function findCricketGames(playerId) {
  logger.debug('find cricket games called');
  let cricketGames = await Cricket.find({ players: { $all: [playerId] }, gameIsRunning: false })
  .then(data => {
    return data;
  })
  .catch(err => {
    logger.error('Failed to find cricket games. ' + err);
  });

  return cricketGames;
}

const calculateOverallX01Avg = (x01Games, playerId) => {
  const averages = x01Games.map(game => {
    if (((((game.playerModels[playerId] || {}).averages || {}).game || {}).begMidGame || 0)  === 0) {
      return null;
    }
    return Math.round(((((game.playerModels[playerId] || {}).averages || {}).game || {}).begMidGame || 0), 2);
  }).filter(stat => stat !== null);

  const sum = averages.reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);

  return Math.round(sum / x01Games.length, 2);
}

const calculatePerGameX01Avg = (x01Games, playerId) => {
  return x01Games.map((game, idx) => {
    if (((((game.playerModels[playerId] || {}).averages || {}).game || {}).begMidGame || 0)  === 0) {
      return null;
    }
    return {
      label: idx + 1,
      value: Math.round((((game.playerModels[playerId] || {}).averages || {}).game || {}).begMidGame || 0),
      desc: game.startingScore + ' (' + dayjs(game.createdAt).format("DD.MM.YYYY") + ')'
    };
  }).filter(stat => stat !== null).slice(-10);
}

const calculateDartsPerLegX01Avg = (x01Games, playerId) => {
  const legsPlayed = getTotalLegsPlayedX01(x01Games);
  const totalDarts = getTotalDartsThrownX01(x01Games, playerId);

  return Math.round(totalDarts / legsPlayed, 2);
}

const getTotalLegsPlayedX01 = (x01Games) => {
  return x01Games.map(game => {
    if ((game.legsPlayed || 0) === 0) {
      return null;
    }
    return game.legsPlayed || 0;
  }).filter(stat => stat !== null).reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);
}

const getTotalDartsThrownX01 = (x01Games, playerId) => {
  return x01Games.map(game => {
    if (((((game.playerModels[playerId] || {}).totalThrow || {}).game || {}).darts || 0) === 0) {
      return null;
    }
    return ((((game.playerModels[playerId] || {}).totalThrow || {}).game || {}).darts || 0);
  }).filter(stat => stat !== null).reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);
}

const getTotalPointsThrownX01 = (x01Games, playerId) => {
  return x01Games.map(game => {
    for (let i = 1; i <= game.setsPlayed || 0; i++) {
      for (let x = 1; x <= game.legsPlayed || 0; x++) {
        const rounds = (((game.allSetsThrows || {})['set-' + i] || {})['leg-' + x] || {});
        return rounds.map(round => {
          if (round.playerId !== playerId) {
            return null;
          }
          return round.roundScore;
        }).filter(stat => stat !== null).reduce((accumulator, value) => {
          return accumulator + value;
        }, 0);
      }
    }
  }).filter(stat => stat !== null).reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);
}

const getNumberOf180sX01 = (x01Games, playerId) => {
  return x01Games.map(game => {
    if (((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['180'] || 0) === 0) {
      return null;
    }
    return ((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['180'] || 0);
  }).filter(stat => stat !== null).reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);
}

const getNumberOf140plusX01 = (x01Games, playerId) => {
  return x01Games.map(game => {
    if (((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['140-159'] || 0) === 0) {
      return null;
    }
    return ((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['140-159'] || 0);
  }).filter(stat => stat !== null).reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);
}

const getCheckoutHitX01 = (x01Games, playerId) => {
  return x01Games.map(game => {
    if (((((game.playerModels[playerId] || {}).checkout || {}).game || {}).hit || 0) === 0) {
      return null;
    }
    return ((((game.playerModels[playerId] || {}).checkout || {}).game || {}).hit || 0);
  }).filter(stat => stat !== null).reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);
}

const getCheckoutTotalX01 = (x01Games, playerId) => {
  return x01Games.map(game => {
    if (((((game.playerModels[playerId] || {}).checkout || {}).game || {}).total || 0) === 0) {
      return null;
    }
    return ((((game.playerModels[playerId] || {}).checkout || {}).game || {}).total || 0);
  }).filter(stat => stat !== null).reduce((accumulator, value) => {
    return accumulator + value;
  }, 0);
}

const getHighestCheckoutX01 = (x01Games, playerId) => {
  let highestCheckout = 0;
  
  x01Games.map(game => {
    Object.keys(((game.playerModels[playerId] || {}).checkoutScores || {}).game || {}).map(key => {
      if (Number(key) > highestCheckout) {
        highestCheckout = Number(key);
      }
    })
  });

  return highestCheckout;
}

const getSectionHitsX01 = (x01Games, playerId, sectionHits) => {
  x01Games.map(game => {
    Object.keys((game.playerModels[playerId] || {}).hit || {}).map(key => {
      let field = key[0];
      let section = key.slice(1);
      let hitCount = ((game.playerModels[playerId] || {}).hit || {})[key] || 0;
      var item = sectionHits.find(item => item.section === section);
      
      if (item) {
        item.hit = item.hit + hitCount;

        if (field === 'S') item.S = item.S + hitCount;
        if (field === 'D') item.D = item.D + hitCount;
        if (field === 'T') item.T = item.T + hitCount;
        
        var index = sectionHits.findIndex(item => item.section == section);
        sectionHits[index] = item;
      }
    })
  });

  return sectionHits;
}