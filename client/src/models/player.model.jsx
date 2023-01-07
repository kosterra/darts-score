const PlayerModel = {
    firstname: '',
    lastname: '',
    nickname: '',
    nbrOfMatches: 0,
    matchesWon: 0,
    soloGames: 0,
    totalThrow: {
      darts: 0,
      rounds: 0
    },
    totalThrowEndGame: {
      darts: 0,
      rounds: 0
    },
    totalThrowBegMidGame: {
      darts: 0,
      rounds: 0
    },
    bestThreeDarts: 0,
    hit: {},
    scoreRanges: {}, 
    averages: {
      overall: 0,
      begMidGame: 0,
      endGame: 0, 
    },
    doubleOut: {},
    checkoutScores: {},
    matches: []
  }

export default PlayerModel;