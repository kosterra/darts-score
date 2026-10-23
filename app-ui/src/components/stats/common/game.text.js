import dayjs from 'dayjs';
import { t } from '../../../utils/i18n';
import { formatDate } from '../../../utils/dates';

// "3 games" in the language of the app (the word in English, as the key of its texts)
export const plural = (count, word) => t(count === 1 ? `{{count}} ${word}` : `{{count}} ${word}s`, { count });

const duration = (from, to) => {
    const minutes = Math.max(1, Math.round(dayjs(to).diff(dayjs(from), 'minute', true)));
    return minutes < 60 ? t('{{minutes}} min', { minutes: minutes }) : t('{{floor}} h {{value}} min', { floor: Math.floor(minutes / 60), value: minutes % 60 });
};

/**
 * When a game ended and how long it took, or when it started while it runs.
 */
export const whenPlayed = (game) => game.gameIsRunning
    ? t('started {{date}}', { date: formatDate(game.createdAt, { time: true }) })
    : t('finished {{date}} after {{duration}}', { date: formatDate(game.updatedAt, { time: true }), duration: duration(game.createdAt, game.updatedAt) });
