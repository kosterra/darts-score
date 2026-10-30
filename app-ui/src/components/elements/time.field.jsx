import { Dropdown } from 'primereact/dropdown';

import { t } from '../../utils/i18n';

// the times to choose from: every quarter of an hour, as "19:30"
const STEP_MINUTES = 15;
const pad = (value) => String(value).padStart(2, '0');
const TIMES = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, index) => {
    const minutes = index * STEP_MINUTES;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
});

/**
 * A time of day as a list in quarters of an hour (24 hours, whatever the
 * device's own format), the same wherever the app asks for one. value: "HH:MM"
 * or ''; onChange(value); clearable: '' can be chosen (no time).
 */
const TimeField = ({ value, onChange, ariaLabel, placeholder, clearable = false, disabled = false, className = '' }) => {
    // a time not on a quarter (set elsewhere) stays choosable
    const times = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES;
    return (
        <Dropdown
            value={value || null}
            options={times}
            onChange={(event) => onChange(event.value ?? '')}
            placeholder={placeholder ?? t('Time')}
            aria-label={ariaLabel ?? t('Time')}
            showClear={clearable}
            disabled={disabled}
            className={`time-field ${className}`}
            scrollHeight="16rem"
        />
    );
};

export default TimeField;
