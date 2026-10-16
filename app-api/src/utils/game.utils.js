import logger from '../models/logger.model.js';
import dayjs from 'dayjs';

const SET_LEG_MODES = ['Best of', 'First to'];
const MAX_LAST_GAMES = 500;

const positiveInteger = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
};

const validDate = (value) => {
    if (typeof value !== 'string' || !value) return null;
    const date = dayjs(value);
    return date.isValid() ? date : null;
};

/**
 * The query for finished games of the given players, from the filters of the
 * comparison page: players (only them, or "includeOthers"), a period
 * ('1 D' … '1 Y', 'All' or 'Custom' with from/to), and for X01 the starting
 * score and the format. Every value is checked, so nothing but plain values
 * reaches the database.
 */
export const createGameFilterQuery = (filters) => {
    const query = { gameIsRunning: false };
    const playerIds = (Array.isArray(filters.playerIds) ? filters.playerIds : []).filter(id => typeof id === 'string');

    if (filters.includeOthers === true) {
        query.players = { $all: playerIds };
    } else {
        query.players = { $all: playerIds, $size: playerIds.length };
    }

    if (filters.dateFilter === 'Custom') {
        const from = validDate(filters.from);
        const to = validDate(filters.to);
        if (from || to) {
            query.createdAt = {
                ...(from && { $gte: from.startOf('day').toDate() }),
                ...(to && { $lte: to.endOf('day').toDate() }),
            };
        }
    } else if (filters.dateFilter && filters.dateFilter !== 'All') {
        let startDate = dayjs().startOf('date').toDate();
        const endDate = dayjs().toDate();

        switch (filters.dateFilter) {
            case '1 W': startDate = dayjs().subtract(1, 'weeks').startOf('date').toDate(); break;
            case '1 M': startDate = dayjs().subtract(1, 'months').startOf('date').toDate(); break;
            case '1 Y': startDate = dayjs().subtract(1, 'years').startOf('date').toDate(); break;
        }

        query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const startingScore = positiveInteger(filters.startingScore);
    if (startingScore) query.startingScore = startingScore;

    // a format like "Best of 3 sets · Best of 3 legs"
    const format = filters.format ?? {};
    if (SET_LEG_MODES.includes(format.setMode)) query.setMode = format.setMode;
    if (SET_LEG_MODES.includes(format.legMode)) query.legMode = format.legMode;
    const sets = positiveInteger(format.numberOfSets);
    const legs = positiveInteger(format.numberOfLegs);
    if (sets) query.numberOfSets = sets;
    if (legs) query.numberOfLegs = legs;

    logger.debug(query);
    return query;
};

/**
 * "Only the last N games together", or null for all of them.
 */
export const lastGamesOf = (filters) => {
    const count = positiveInteger(filters.lastGames);
    return count ? Math.min(count, MAX_LAST_GAMES) : null;
};

/**
 * Runs a game query with the "last N games" filter: newest first, then limited.
 */
export const findFilteredGames = (Model, query, filters, lean = false) => {
    const limit = lastGamesOf(filters);
    let cursor = Model.find(query).sort({ createdAt: -1 });
    if (limit) cursor = cursor.limit(limit);
    return lean ? cursor.lean() : cursor;
};
