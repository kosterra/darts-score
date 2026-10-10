import logger from '../models/logger.model.js';
import dayjs from 'dayjs';

export const createGameFilterQuery = (filters) => {
    const query = { gameIsRunning: false };

    if (filters.includeOthers) {
        query.players = { $all: filters.playerIds };
    } else {
        query.players = { $all: filters.playerIds, $size: filters.playerIds.length };
    }

    if (filters.dateFilter && filters.dateFilter !== 'All') {
        let startDate = dayjs().startOf('date').toDate();
        const endDate = dayjs();

        switch (filters.dateFilter) {
            case '1 W': startDate = dayjs().subtract(1, 'weeks').startOf('date').toDate(); break;
            case '1 M': startDate = dayjs().subtract(1, 'months').startOf('date').toDate(); break;
            case '1 Y': startDate = dayjs().subtract(1, 'years').startOf('date').toDate(); break;
        }

        query.createdAt = { $gte: startDate, $lt: endDate };
    }

    logger.debug(query);
    return query;
};
