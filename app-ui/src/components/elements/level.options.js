import { t } from '../../utils/i18n';

// the filter of the lists of games and trainings by the level played at (see PlayLevelTag), as FilterPills options
export const LEVEL_OPTIONS = [
    { label: t('All levels'), value: 'all' },
    { label: t('Pub'), value: 'pub' },
    { label: t('Amateur'), value: 'amateur' },
    { label: t('Pro'), value: 'pro' },
    { label: t('World class'), value: 'worldClass' },
];
