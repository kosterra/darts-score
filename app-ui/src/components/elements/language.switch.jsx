import { Dropdown } from 'primereact/dropdown';

import { LANGUAGES, currentLanguage, setLanguage, t } from '../../utils/i18n';

const showCode = (option) => option && (
    <span className="d-inline-flex align-items-center gap-2">
        <i className="pi pi-globe" aria-hidden="true" />
        {option.code.toUpperCase()}
    </span>
);

/**
 * The language of the app, before logging in (start page, login, quick
 * games): the code with a globe, the languages by their own name. The app
 * starts again in the language picked, and the account takes it over at the
 * next login.
 */
const LanguageSwitch = ({ className = '' }) => (
    <Dropdown
        value={currentLanguage()}
        options={LANGUAGES}
        optionLabel="label"
        optionValue="code"
        valueTemplate={showCode}
        onChange={(event) => setLanguage(event.value, { beforeLogin: true })}
        className={`language-switch p-inputtext-sm ${className}`}
        panelClassName="language-switch-panel"
        scrollHeight="16rem"
        aria-label={t('Language')}
    />
);

export default LanguageSwitch;
