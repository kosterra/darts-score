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
  legsWon: 0,
  currentSetLegsWon: 0,
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
  hit: {
    // empty object that will fill up as the game goes, the number displayed is the number of time it hit a section (ex: T20: 5)
  },
  scoreRanges: {}, // model "0-19": 5, 20-39: 3...
  averages: {
    overall: 0,
    begMidGame: 0,
    endGame: 0, // 140 and below
  },
  doubleOut: {}, //model     D1: {miss: 5, hit: 1}
  checkoutScores: {}, // save the starting score at beg of a throw that ended up in a finish
}

const X01Models = {
  X01Model,
  X01PlayerModel
}

export default X01Models;