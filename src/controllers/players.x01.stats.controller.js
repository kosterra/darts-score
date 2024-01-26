const logger = require("../models/logger.model");
const db = require("../models/db.model");
const dayjs = require("dayjs");

const X01 = db.x01;
const { playersX01StatsModel, checkoutItemModel } = require("../models/players.x01.stats.models");

exports.getPlayersX01Stats = (req, res) => {
  logger.debug("load x01 statistics for multiple players!");

  (async () => {
    const x01PlayersStats = await calculateX01PlayersStats(req.body);
    res.send(x01PlayersStats);
  })()
};

async function calculateX01PlayersStats(body) {
  logger.debug('calculate x01 players stats called')
  const playersX01Stats = JSON.parse(JSON.stringify(playersX01StatsModel))

  const x01Games = await findX01Games(body)

  playersX01Stats.playedGames = x01Games.length

  body.playerIds.map((playerId, idx) => {
    const wonGamesX01 = x01Games.filter(game => game.playerModels[playerId].hasWonGame === true).length

    playersX01Stats.wonGames['player' + (idx + 1)] = wonGamesX01

    playersX01Stats.avg.overall['player' + (idx + 1)] = calculateOverallX01Avg(x01Games, playerId)
    playersX01Stats.avg.dartsPerLeg['player' + (idx + 1)] = calculateDartsPerLegX01Avg(x01Games, playerId)
    playersX01Stats.avg.perGame['player' + (idx + 1)] = calculatePerGameX01Avg(x01Games, playerId)

    playersX01Stats.throwedDarts['player' + (idx + 1)] = getTotalDartsThrownX01(x01Games, playerId)
    playersX01Stats.throwedPoints['player' + (idx + 1)] = getTotalPointsThrownX01(x01Games, playerId)

    playersX01Stats.num180s['player' + (idx + 1)] = getNumberOf180sX01(x01Games, playerId)
    playersX01Stats.num160plus['player' + (idx + 1)] = getNumberOf160plusX01(x01Games, playerId)
    playersX01Stats.num140plus['player' + (idx + 1)] = getNumberOf140plusX01(x01Games, playerId)

    playersX01Stats.checkouts.hit['player' + (idx + 1)] = getCheckoutHitX01(x01Games, playerId)
    playersX01Stats.checkouts.total['player' + (idx + 1)] = getCheckoutTotalX01(x01Games, playerId)
    playersX01Stats.checkouts.highest['player' + (idx + 1)] = getHighestCheckoutX01(x01Games, playerId)
    //playersX01Stats.checkouts.rates['player' + (idx + 1)] = getCheckoutRatesX01(x01Games, playerId)

    //playersX01Stats.scoreRanges = getPlayersScoreRangesX01(x01Games, playersX01Stats.scoreRanges, playerId);

    //playersX01Stats.sectionHits = getSectionHitsX01(x01Games, playerId, playersX01Stats.sectionHits)
  })

  return playersX01Stats
}

async function findX01Games(body) {
  logger.debug('find x01 games by filter body');
  let query = createFilterQuery(body)

  let x01Games = await X01.find(query)
    .then(data => {
      return data;
    })
    .catch(err => {
      logger.error('Failed to find x01 games. ' + err);
    });

  return x01Games;
}

const createFilterQuery = (body) => {
  var query = {
    gameIsRunning: false
  };

  // Filter include games with other players
  if (body.hasOwnProperty('includeOthers') && body['includeOthers']) {
    logger.debug(body['includeOthers'])
    query.players = {
      $all: body.playerIds,
    };
  } else {
    query.players = {
      $all: body.playerIds,
      $size: body.playerIds.length
    }
  }

  // Filter game date 1d, 1w, 1m, 1j and all time
  if (body.hasOwnProperty('dateFilter') && body['dateFilter'] !== 'All') {

    let startDate = dayjs().startOf('date').toDate();
    let endDate = dayjs()

    switch (body['dateFilter']) {
      case '1 W':
        startDate = dayjs().subtract(1, 'weeks').startOf('date').toDate()
        break;
      case '1 M':
        startDate = dayjs().subtract(1, 'months').startOf('date').toDate()
        break;
      case '1 Y':
        startDate = dayjs().subtract(1, 'years').startOf('date').toDate()
        break;
      default:
    }

    query.createdAt = {
      $gte: startDate,
      $lt: endDate
    }
  }

  logger.debug(query)

  return query
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

const getNumberOf160plusX01 = (x01Games, playerId) => {
  return x01Games.map(game => {
    if (((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['160-179'] || 0) === 0) {
      return null;
    }
    return ((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['160-179'] || 0);
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

const getCheckoutRatesX01 = (x01Games, playerId) => {
  let checkoutRates = [];
  var excludes = ['total', 'miss', 'hit'];
  
  x01Games.map(game => {
    Object.keys(((game.playerModels[playerId] || {}).checkout || {}).sections || {}).map(key => {
      if (excludes.indexOf(key) === -1) {
        var gameItem = (((game.playerModels[playerId] || {}).checkout || {}).sections || {})[key] || 0;
        var item = JSON.parse(JSON.stringify(checkoutItemModel));
        item.section = key.toString();
        
        const existingIndex = checkoutRates.findIndex(item => item.section === key);
  
        if (existingIndex >= 0) {
          item = checkoutRates[existingIndex];
        }
  
        item.hit = item.hit + gameItem.hit;
        item.miss = item.miss + gameItem.miss;
        item.total = item.hit + item.miss;
        item.rate = Math.round((100 * item.hit) / item.total, 0);
  
        if (existingIndex >= 0) {
          checkoutRates[existingIndex] = item;
        } else {
          checkoutRates.push(item);
        }
      }
    })
  });

  return checkoutRates;
}

const getScoreRangesX01 = (x01Games, playerId) => {
  let scoreRanges = [];
  
  x01Games.map(game => {
    Object.keys(((game.playerModels[playerId] || {}).scoreRanges || {}).game || {}).map(key => {
      if (key !== 'Busted') {
        var item = {};
        const existingIndex = scoreRanges.findIndex(item => item.range === key);

        if (existingIndex >= 0) {
          item = scoreRanges[existingIndex];
        }

        item.range = key;
        item.count = (item.count ? item.count : 0) + (((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})[key];

        if (existingIndex >= 0) {
          scoreRanges[existingIndex] = item;
        } else {
          scoreRanges.push(item);
        }
      }
    })
  });

  scoreRanges.sort(function(a, b) {
    if (a.range === 'ZERO') {
      return -1;
    } else {
      var aValue = a.range.substring(0, a.range.indexOf('-') >= 0 ? a.range.indexOf('-') : a.range.length);
      var bValue = b.range.substring(0, b.range.indexOf('-') >= 0 ? b.range.indexOf('-') : b.range.length);
      return Number(aValue) - Number(bValue);
    }
  });

  return scoreRanges;
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