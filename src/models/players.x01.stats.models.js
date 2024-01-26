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
        }
    },
    checkoutRates: {},
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
            section: "20",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "1",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "18",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "4",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "13",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "6",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "10",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "15",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "17",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "3",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "19",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "7",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "16",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "8",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "11",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "14",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "9",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "12",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
        },
        {
            section: "5",
            hit: 0,
            S: 0,
            D: 0,
            T: 0
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