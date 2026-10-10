import PlayerConfigOptions from "../components/game_config/config_options/player.config.options";

const CricketGameModel = {
    gameIsRunning: true,
    isSoloGame: false,
    hasWinner: false,
    startingScore: 0,
    numberOfPlayers: PlayerConfigOptions.numberOfPlayerOptions.default,
    players: [],
    currentPlayerTurn: '',
    currentThrow: ['', '', ''],
    allThrows: [],
    playerModels: {}
}

const CricketPlayerModel = {
    hasWonGame: false,
    score: null,
    totalThrow: {
        game: {
            darts: 0,
            rounds: 0
        }
    },
    hit: {},
    sectionHit: {
        "20": 0,
        "19": 0,
        "18": 0,
        "17": 0,
        "16": 0,
        "15": 0,
        "25": 0,
    }
}

const CricketModels = {
    CricketGameModel,
    CricketPlayerModel
}

export default CricketModels;