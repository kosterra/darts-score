import { useState } from 'react';
import { Calendar } from 'primereact/calendar';

import { calendarFormat } from '../../utils/dates';
import { t } from '../../utils/i18n';

import TimeField from './time.field';

const pad = (value) => String(value).padStart(2, '0');
const timeOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * A day and a time, as two fields side by side: the calendar for the day and
 * a list of times in quarters of an hour (it opens at the time set), instead
 * of the calendar's arrows that step the time one hour or minute a click.
 * value: a Date or null; onChange(Date | null); minDate: the first day offered
 * defaultTime: the time a day gets when none was set yet (noon unless said otherwise)
 */
const DateTimeField = ({ value, onChange, minDate, disabled = false, placeholder, ariaLabel, className = '', defaultTime = '12:00' }) => {
    const time = value ? timeOf(value) : '';
    // without a day yet the calendar opens at the month of the first day offered, not at today
    const [viewed, setViewed] = useState(null);
    const viewDate = value ?? viewed ?? minDate ?? new Date();
    const withTime = (day, hhmm) => {
        const [hours, minutes] = hhmm.split(':').map(Number);
        const next = new Date(day);
        next.setHours(hours, minutes, 0, 0);
        return next;
    };
    return (
        <span className={`date-time-field ${className}`}>
            <Calendar
                value={value}
                onChange={(event) => onChange(event.value ? withTime(event.value, time ?? defaultTime) : null)}
                dateFormat={calendarFormat()}
                showIcon
                icon="pi pi-calendar"
                minDate={minDate}
                viewDate={viewDate}
                onViewDateChange={(event) => setViewed(event.value)}
                disabled={disabled}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className="date-time-day"
            />
            <TimeField
                value={time}
                onChange={(next) => next && onChange(withTime(value ?? minDate ?? new Date(), next))}
                disabled={disabled}
                ariaLabel={ariaLabel ? `${ariaLabel} · ${t('Time')}` : t('Time')}
                className="date-time-time"
            />
        </span>
    );
};

export default DateTimeField;
