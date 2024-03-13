const logger = require("../models/logger.model");

const createPlayerFilterQuery = (filters) => {
    var query = {
        _id: {
            $in: filters.playerIds
        }
    };

    logger.debug(query);

    return query
}

// Export methods
module.exports = {
    createPlayerFilterQuery: createPlayerFilterQuery
};