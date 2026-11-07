import { t } from '../../utils/i18n';
import { AVERAGE_LEVELS } from '../../utils/average.levels';

// the filter of the lists of games and trainings by the level played at (see PlayLevelTag), as
// FilterPills options: every step of the average levels, lowest first, with its icon in its colour
export const LEVEL_OPTIONS = [
    { label: t('All levels'), value: 'all' },
    ...AVERAGE_LEVELS.map(level => ({ label: level.name, value: level.key, icon: level.icon, get iconColor() { return level.color; } })),
];
