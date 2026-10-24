import { currentLanguage } from './i18n';

const UNITS = [['day', 24 * 60 * 60], ['hour', 60 * 60], ['minute', 60]];

/**
 * How long ago (or how far ahead) a moment is, in words of the language:
 * "vor 3 Minuten", "in 2 hours", "now".
 */
export const relativeTime = (value, now = Date.now(), language = currentLanguage()) => {
    const seconds = Math.round((new Date(value).getTime() - now) / 1000);
    const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
    }
    return format.format(0, 'minute');
};
