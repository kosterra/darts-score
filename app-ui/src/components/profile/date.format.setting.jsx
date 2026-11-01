import { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import dayjs from 'dayjs';

import useGamePreferences, { accountSaver } from '../../utils/use.game.preferences';
import useAutoSave from '../../utils/use.auto.save';
import { useAuth } from '../../utils/auth.context';
import { DATE_FORMATS, languageFormat } from '../../utils/dates';
import { t } from '../../utils/i18n';

// a day to show each format with: 24 October of this year
const EXAMPLE = dayjs().month(9).date(24);
// the dropdown shows no choice for null: the usual format of the language stands for it
const AS_LANGUAGE = 'language';

/**
 * How dates are shown: the usual format of the language, or one the player
 * chooses, with an example each. Kept with their account, saved as you go;
 * onStatus(autosave) tells the page how the saving goes (shown beside the
 * section's title).
 */
const DateFormatSetting = ({ onStatus }) => {
    const { setUser } = useAuth();
    const [preferences] = useGamePreferences();
    const [value, setValue] = useState(preferences.dateFormat ?? AS_LANGUAGE);
    const dateSave = useAutoSave((dateFormat) => accountSaver(setUser)({ dateFormat }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => onStatus?.(dateSave), [dateSave.status, dateSave.error]);
    const options = [
        { value: AS_LANGUAGE, label: t('As the language ({{example}})', { example: EXAMPLE.format(languageFormat()) }) },
        ...DATE_FORMATS.map(format => ({ value: format, label: EXAMPLE.format(format) })),
    ];
    const change = (next) => {
        setValue(next);
        dateSave.change(next === AS_LANGUAGE ? null : next, { now: true });
    };

    return (
        <>
            <p className="setting-title">{t('Date format')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                    <Dropdown value={value} options={options} onChange={(e) => change(e.value)} aria-label={t('Date format')} className="w-100" />
                    <span className="text-faint fs-8">{t('How dates are shown everywhere in the app.')}</span>
                </div>
            </div>
        </>
    );
};

export default DateFormatSetting;
