import { t } from '../../utils/i18n';

// what a board says in its corner, in the colours of the statuses (called green, live orange, the others neutral)
export const BOARD_STATUS = {
    called: { label: t('Called'), severity: 'success' },
    playing: { label: t('Live'), severity: 'warning' },
    free: { label: t('Board free'), severity: 'secondary' },
    out: { label: t('Taken out'), severity: 'secondary' },
};
