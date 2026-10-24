import { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import dayjs from 'dayjs';

import useGamePreferences from '../../utils/use.game.preferences';
import { DATE_FORMATS, languageFormat } from '../../utils/dates';
import { t } from '../../utils/i18n';

// a day to show each format with: 24 October of this year
const EXAMPLE = dayjs().month(9).date(24);
// the dropdown shows no choice for null: the usual format of the language stands for it
const AS_LANGUAGE = 'language';

/**
 * How dates are shown: the usual format of the language, or one the player
 * chooses, with an example each. Kept with their account.
 */
const DateFormatSetting = ({ onSaved }) => {
    const [preferences, save] = useGamePreferences();
    const [value, setValue] = useState(preferences.dateFormat ?? AS_LANGUAGE);
    const options = [
        { value: AS_LANGUAGE, label: t('As the language ({{example}})', { example: EXAMPLE.format(languageFormat()) }) },
        ...DATE_FORMATS.map(format => ({ value: format, label: EXAMPLE.format(format) })),
    ];
    const change = (next) => {
        setValue(next);
        save({ dateFormat: next === AS_LANGUAGE ? null : next }).then(() => onSaved?.(t('Date format')));
    };

    return (
        <>
            <p className="setting-title">{t('Date format')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                    <Dropdown value={value} options={options} onChange={(e) => change(e.value)} aria-label={t('Date format')} className="w-100" />
                    <span className="text-faint fs-8">{t('How dates are shown everywhere in the app. Saved right away.')}</span>
                </div>
            </div>
        </>
    );
};

export default DateFormatSetting;
