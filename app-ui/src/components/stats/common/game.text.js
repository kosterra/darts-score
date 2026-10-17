import dayjs from 'dayjs';

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const duration = (from, to) => {
    const minutes = Math.max(1, Math.round(dayjs(to).diff(dayjs(from), 'minute', true)));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

/**
 * When a game ended and how long it took, or when it started while it runs.
 */
export const whenPlayed = (game) => game.gameIsRunning
    ? `started ${dayjs(game.createdAt).format('DD.MM.YYYY HH:mm')}`
    : `finished ${dayjs(game.updatedAt).format('DD.MM.YYYY HH:mm')} after ${duration(game.createdAt, game.updatedAt)}`;
