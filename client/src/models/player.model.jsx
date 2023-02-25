const PlayerModel = {
    firstname: '',
    lastname: '',
    nickname: '',
    nbrOfMatches: 0,
    matchesWon: 0,
    soloGames: 0,
    totalThrow: {
      overall: {
        darts: 0,
        rounds: 0
      }
    },
    totalThrowEndGame: {
      overall: {
        darts: 0,
        rounds: 0
      }
    },
    totalThrowBegMidGame: {
      overall: {
        darts: 0,
        rounds: 0
      }
    },
    bestThreeDarts: {
      overall: 0
    },
    hit: {},
    scoreRanges: {}, 
    averages: {
      overall: {
        overall: 0,
        begMidGame: 0,
        endGame: 0
      }
    },
    checkout: {
      overall: {
        hit: 0,
        miss: 0,
        total: 0
      },
      sections: {}
    },
    checkoutScores: {
      overall: {}
    },
    matches: []
  }

export default PlayerModel;