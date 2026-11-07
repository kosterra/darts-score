import { FaSeedling, FaBeerMugEmpty, FaUsers, FaFlag, FaMedal, FaEarthEurope, FaCrown } from 'react-icons/fa6';
import { t } from './i18n';
import { ACCENT, readable } from './palette';
import { LEVEL_STEPS } from '../rules/levels.play.js';

// the look of every step: its name, colour and icon, from grey to gold
const LOOKS = {
    beginner: { name: 'Beginner', get color() { return readable('#a3a3a3'); }, icon: FaSeedling },
    hobby: { name: 'Hobby', get color() { return readable('#b5c9a8'); }, icon: FaBeerMugEmpty },
    amateur: { name: 'Amateur', get color() { return ACCENT.green; }, icon: FaUsers },
    semiPro: { name: 'Semi-pro', get color() { return readable('#8fc3df'); }, icon: FaFlag },
    pro: { name: 'Pro', get color() { return readable('#c3a9e6'); }, icon: FaMedal },
    worldClass: { name: t('World class'), get color() { return readable('#e8b98a'); }, icon: FaEarthEurope },
    elite: { name: 'Elite', get color() { return ACCENT.gold; }, icon: FaCrown },
};

/**
 * Levels of the 3-dart average, the steps of the one scale of the app
 * (rules/levels.play.js, also the level a game was played at), on the same
 * steps as the minimum averages of the player levels (40, 50, 60, 75, 90):
 * { key, min (the average it starts from), name, color, icon }.
 */
export const AVERAGE_LEVELS = LEVEL_STEPS.map(step => Object.defineProperties(
    { key: step.key, min: step.average },
    Object.getOwnPropertyDescriptors(LOOKS[step.key]),
));

// a level by its key ('semiPro'), or null
export const averageLevelByKey = (key) => AVERAGE_LEVELS.find(level => level.key === key) ?? null;

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
