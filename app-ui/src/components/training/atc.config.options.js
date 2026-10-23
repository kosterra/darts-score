
import { t } from '../../utils/i18n';const ATCConfigOptions = {
    modeOptions: {
        values: [
            { value: 'Single', description: t('Only singles count; finish on the outer bull.') },
            { value: 'Double', description: t('Only doubles count; finish on the bullseye.') },
            { value: 'Triple', description: t('Only trebles count; finish on the bullseye.') },
            { value: 'All', description: t('Any ring counts; finish on either bull.') }
        ],
        default: 'Double'
    }
};

export default ATCConfigOptions;
