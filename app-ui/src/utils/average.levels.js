import { FaSeedling, FaBeerMugEmpty, FaUsers, FaFlag, FaMedal, FaEarthEurope, FaCrown } from 'react-icons/fa6';
import { t } from './i18n';
import { ACCENT } from './palette';

/**
 * Levels of the 3-dart average, on the same steps as the minimum averages of
 * the player levels (40, 50, 60, 75, 90), with icons and colours in their
 * style, from grey to gold.
 */
export const AVERAGE_LEVELS = [
    { min: 0, name: 'Beginner', color: '#a3a3a3', icon: FaSeedling },
    { min: 25, name: 'Hobby', color: '#b5c9a8', icon: FaBeerMugEmpty },
    { min: 40, name: 'Amateur', color: ACCENT.green, icon: FaUsers },
    { min: 50, name: 'Semi-pro', color: '#8fc3df', icon: FaFlag },
    { min: 60, name: 'Pro', color: '#c3a9e6', icon: FaMedal },
    { min: 75, name: t('World class'), color: '#e8b98a', icon: FaEarthEurope },
    { min: 90, name: 'Elite', color: ACCENT.gold, icon: FaCrown },
];

/**
 * The level of an average, or null without one.
 */
export const averageLevelOf = (average) => {
    if (average == null || Number.isNaN(Number(average))) return null;
    return [...AVERAGE_LEVELS].reverse().find(level => Number(average) >= level.min);
};

/**
 * The level after the one of this average, or null at the top.
 */
export const nextAverageLevel = (average) => {
    const current = averageLevelOf(average);
    if (!current) return null;
    return AVERAGE_LEVELS[AVERAGE_LEVELS.indexOf(current) + 1] ?? null;
};

/**
 * Where a series of averages reaches a new level: the first value and every
 * value whose level differs from the one before. Empty values are skipped.
 * Resolves to [{ index, level }].
 */
export const levelChanges = (values) => {
    const changes = [];
    let previous = null;
    values.forEach((value, index) => {
        const level = averageLevelOf(value);
        if (!level) return;
        if (level !== previous) changes.push({ index, level });
        previous = level;
    });
    return changes;
};
