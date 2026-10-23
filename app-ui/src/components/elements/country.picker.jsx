import { useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';

import CountryFlag from './country.flag';
import { countries } from '../../utils/countries';
import { t } from '../../utils/i18n';

const withFlag = (option) => (
    <span className="d-inline-flex align-items-center gap-2"><CountryFlag code={option.code} />{option.name}</span>
);

/**
 * A country to choose, with its flag, the countries by their name in the
 * language of the app and a search; '' when none is chosen.
 */
const CountryPicker = ({ value, onChange, disabled = false, className = 'profile-club' }) => {
    const options = useMemo(() => countries(), []);
    return (
        <Dropdown
            value={value || null}
            options={options}
            optionLabel="name"
            optionValue="code"
            onChange={(event) => onChange(event.value ?? '')}
            filter
            showClear={!disabled}
            disabled={disabled}
            placeholder={t('Choose a country')}
            valueTemplate={(option, props) => option ? withFlag(option) : props.placeholder}
            itemTemplate={withFlag}
            className={className}
            aria-label={t('Country')}
        />
    );
};

export default CountryPicker;
