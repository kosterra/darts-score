import ScoreConfigOptions from "../components/game_config/config_options/score.config.options";
import SetsLegsConfigOptions from "../components/game_config/config_options/sets.legs.config.options";
import PlayerConfigOptions from "../components/game_config/config_options/player.config.options";

const X01Model = {
  gameIsRunning: true,
  isSoloGame: false,
  hasWinner: false,
  startingScore: ScoreConfigOptions.gameScoreOptions.default,
  setMode: SetsLegsConfigOptions.setLegModeOptions.default,
  legMode: SetsLegsConfigOptions.setLegModeOptions.default,
  legInMode: SetsLegsConfigOptions.legInOptions.default,
  legOutMode: SetsLegsConfigOptions.legOutOptions.default,
  numberOfSets: SetsLegsConfigOptions.boSetNumberOptions.default,
  numberOfLegs: SetsLegsConfigOptions.boLegNumberOptions.default,
  numberOfPlayers: PlayerConfigOptions.numberOfPlayerOptions.default,
  players: [],
  startingPlayerLeg: '',
  startingPlayerSet: '',
  currentPlayerTurn: '',
  setsPlayed: 0,
  legsPlayed: 0,
  currentSet: 1,
  currentSetLeg: 1,
  currentThrow: ['','',''], 
  currentLegThrows: [],
  allSetsThrows: {},
  playerModels: {}
}

const X01PlayerModel = {
  hasWonGame: false,
  score: null,
  setsWon: 0,
  legsWon: {
    game: 0
  },
  currentSetLegsWon: 0,
  totalThrow: {
    game: {
      darts: 0,
      rounds: 0
    }
  },
  totalThrowEndGame: {
    game: {
      darts: 0,
      rounds: 0
    }
  },
  totalThrowBegMidGame: {
    game: {
      darts: 0,
      rounds: 0
    }
  },
  bestThreeDarts: {
    game: 0
  },
  hit: {},
  scoreRanges: {},
  averages: {
    game: {
      overall: 0,
      begMidGame: 0,
      endGame: 0, // 140 and below
    }
  },
  checkout: {
    game: {
      hit: 0,
      miss: 0,
      total: 0
    },
    sections: {}
  },
  checkoutScores: {}
}

const X01Models = {
  X01Model,
  X01PlayerModel
}

export default X01Models;