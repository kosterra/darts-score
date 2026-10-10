import logger from '../models/logger.model.js';

export const createPlayerFilterQuery = (filters) => {
    const query = { _id: { $in: filters.playerIds } };
    logger.debug(query);
    return query;
};
