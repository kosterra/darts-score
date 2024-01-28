const PlayersX01StatsModel = {
    playedGames: 0,
    wonGames: {
        player1: 0,
        player2: 0
    },
    avg: {
        overall: {
            player1: 0,
            player2: 0
        },
        dartsPerLeg: {
            player1: 0,
            player2: 0
        },
        perGame: [],
    },
    throwedDarts: {
        player1: 0,
        player2: 0
    },
    throwedPoints: {
        player1: 0,
        player2: 0
    },
    num180s: {
        player1: 0,
        player2: 0
    },
    num160plus: {
        player1: 0,
        player2: 0
    },
    num140plus: {
        player1: 0,
        player2: 0
    },
    checkouts: {
        hit : {
            player1: 0,
            player2: 0
        },
        total: {
            player1: 0,
            player2: 0
        },
        highest: {
            player1: 0,
            player2: 0
        },
        rates: {}
    },
    scoreRanges: [
        {
            range: "ZERO"
        },
        {
            range: "1-19"
        },
        {
            range: "20-39"
        },
        {
            range: "40-59"
        },
        {
            range: "60-79"
        },
        {
            range: "80-99"
        },
        {
            range: "100-119"
        },
        {
            range: "120-139"
        },
        {
            range: "140-159"
        },
        {
            range: "160-179"
        },
        {
            range: "180"
        }
    ],
    sectionHits: [
        {
            section: "20"
        },
        {
            section: "1"
        },
        {
            section: "18"
        },
        {
            section: "4"
        },
        {
            section: "13"
        },
        {
            section: "6"
        },
        {
            section: "10"
        },
        {
            section: "15"
        },
        {
            section: "17"
        },
        {
            section: "3"
        },
        {
            section: "19"
        },
        {
            section: "7"
        },
        {
            section: "16"
        },
        {
            section: "8"
        },
        {
            section: "11"
        },
        {
            section: "14"
        },
        {
            section: "9"
        },
        {
            section: "12"
        },
        {
            section: "5"
        }
    ]
};

const AvgItemModel = {
    label: "",
    desc: ""
};

const CheckoutItemModel = {
    "section": "",
    "hit": 0,
    "miss": 0,
    "total": 0,
    "rate": 0
};

module.exports = {
    playersX01StatsModel: PlayersX01StatsModel,
    checkoutItemModel: CheckoutItemModel,
    avgItemModel: AvgItemModel
};