import dayjs from 'dayjs';

import { currentLanguage } from './i18n';
import { gamePreferences } from './game.preferences';

// How dates are shown: the usual format of the language, unless the player
// chose another on their user profile (kept with their account).

export const DATE_FORMATS = ['DD.MM.YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const BY_LANGUAGE = { de: 'DD.MM.YYYY', en: 'DD/MM/YYYY', fr: 'DD/MM/YYYY', it: 'DD/MM/YYYY', es: 'DD/MM/YYYY' };

// the format in use: the player's own, or the language's
export const dateFormat = (language = currentLanguage()) => {
    const chosen = gamePreferences().dateFormat;
    return DATE_FORMATS.includes(chosen) ? chosen : languageFormat(language);
};
export const languageFormat = (language = currentLanguage()) => BY_LANGUAGE[language] ?? 'DD.MM.YYYY';

// the day and month without the year, in the order of the format: 24.10. · 24/10 · 10/24 · 10-24
const withoutYear = (format) => ({ 'DD.MM.YYYY': 'DD.MM.', 'DD/MM/YYYY': 'DD/MM', 'MM/DD/YYYY': 'MM/DD', 'YYYY-MM-DD': 'MM-DD' })[format];

/**
 * A date in the format in use. year: 'full' (2026), 'short' (26) or 'none';
 * time: with the hour and minute (seconds: with the seconds too). Empty: '–'.
 */
export const formatDate = (value, { year = 'full', time = false, seconds = false } = {}) => {
    if (!value) return '–';
    const format = dateFormat();
    const day = year === 'none' ? withoutYear(format) : year === 'short' ? format.replace('YYYY', 'YY') : format;
    return dayjs(value).format(time ? `${day} ${seconds ? 'HH:mm:ss' : 'HH:mm'}` : day);
};

export const formatDateTime = (value) => formatDate(value, { time: true });

// the format for PrimeReact's Calendar (dd.mm.yy, dd/mm/yy, mm/dd/yy, yy-mm-dd)
export const calendarFormat = () => dateFormat().replace('DD', 'dd').replace('MM', 'mm').replace('YYYY', 'yy');
