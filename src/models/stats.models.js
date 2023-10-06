const PlayerStatsModel = {
    playerId: '',
    playedGames: {
        total: 0,
        x01: 0,
        cricket: 0
    },
    wonGames: {
        total: 0,
        x01: 0,
        cricket: 0
    },
    avg: {
        overallX01: 0,
        perGameX01: [],
        dartsPerLegX01: 0,
    },
    throwedDarts: {
        x01: 0
    },
    throwedPoints: {
        x01: 0
    },
    num180s: 0,
    num140plus: 0,
    checkouts: {
        hit: 0,
        total: 0,
        highest: 0,
        rates: []
    },
    scoreRanges: [],
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

const CheckoutItemModel = {
    "section": "",
    "hit": 0,
    "miss": 0,
    "total": 0,
    "rate": 0
};

module.exports = {
    playerStatsModel: PlayerStatsModel,
    checkoutItemModel: CheckoutItemModel
};