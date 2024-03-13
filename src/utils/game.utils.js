const logger = require("../models/logger.model");
const dayjs = require("dayjs");

const createGameFilterQuery = (filters) => {
    var query = {
        gameIsRunning: false
    };

    // Filter include games with other players
    if (filters.hasOwnProperty('includeOthers') && filters['includeOthers']) {
        logger.debug(filters['includeOthers'])
        query.players = {
            $all: filters.playerIds,
        };
    } else {
        query.players = {
            $all: filters.playerIds,
            $size: filters.playerIds.length
        }
    }

    // Filter game date 1d, 1w, 1m, 1j and all time
    if (filters.hasOwnProperty('dateFilter') && filters['dateFilter'] !== 'All') {

        let startDate = dayjs().startOf('date').toDate();
        let endDate = dayjs()

        switch (filters['dateFilter']) {
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

// Export methods
module.exports = {
    createGameFilterQuery: createGameFilterQuery
};