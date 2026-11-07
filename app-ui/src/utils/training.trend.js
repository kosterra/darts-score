/**
 * A player's attempts at one kind of training over time, for the chart of
 * their trainings panel.
 */

import { boardKeyOf, boardOf } from '../rules/trainings';

// the first and the latest attempts compared, so many of each
const COMPARED = 10;

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;

/**
 * A player's attempts of one kind of training, oldest first, each with the
 * best up to it: [{ index, at, score, best }]. trainings: the club's of the
 * kind (as the API gives them, newest first).
 */
export const trendOf = (trainings, playerId, lower = false) => {
    const own = trainings
        .filter(entry => String(entry.player?.id) === String(playerId) && Number.isFinite(Number(entry.score)))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let best = null;
    return own.map((entry, index) => {
        const score = Number(entry.score);
        best = best === null ? score : lower ? Math.min(best, score) : Math.max(best, score);
        return { index, at: entry.createdAt, score, best };
    });
};

/**
 * How the latest attempts compare with the first ones: the change of the mean
 * of each (up to ten; with fewer than four attempts in all nothing), positive
 * when it got better (fewer darts where fewer are better).
 */
export const progressOf = (rows, lower = false) => {
    if (rows.length < 4) return null;
    const size = Math.min(COMPARED, Math.floor(rows.length / 2));
    const first = mean(rows.slice(0, size).map(row => row.score));
    const latest = mean(rows.slice(-size).map(row => row.score));
    return { change: lower ? first - latest : latest - first, size };
};

/**
 * The boards (settings that split the scoreboard, see boardOf) a player has
 * played a training on, the one played most first (the latest of them on a
 * tie, as the trainings panel picks its best): [{ key, settings, count }].
 * One board, key '', for a training without such settings.
 */
export const playedBoards = (trainings, playerId, definition) => {
    const boards = new Map();
    trainings
        .filter(entry => String(entry.player?.id) === String(playerId))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach((entry, index) => {
            const key = boardKeyOf(definition, entry.settings);
            const board = boards.get(key) ?? { key, settings: boardOf(definition, entry.settings), count: 0 };
            boards.set(key, { ...board, count: board.count + 1, last: index });
        });
    return [...boards.values()].sort((a, b) => b.count - a.count || b.last - a.last).map(({ key, settings, count }) => ({ key, settings, count }));
};
