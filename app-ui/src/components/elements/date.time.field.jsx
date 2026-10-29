import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';

import { calendarFormat } from '../../utils/dates';
import { t } from '../../utils/i18n';

// the times to choose from: every quarter of an hour
const STEP_MINUTES = 15;
const pad = (value) => String(value).padStart(2, '0');
const TIMES = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, index) => {
    const minutes = index * STEP_MINUTES;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
});
const timeOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * A day and a time, as two fields side by side: the calendar for the day and
 * a list of times in quarters of an hour (it opens at the time set), instead
 * of the calendar's arrows that step the time one hour or minute a click.
 * value: a Date or null; onChange(Date | null); minDate: the first day offered
 * defaultTime: the time a day gets when none was set yet (noon unless said otherwise)
 */
const DateTimeField = ({ value, onChange, minDate, disabled = false, placeholder, ariaLabel, className = '', defaultTime = '12:00' }) => {
    const time = value ? timeOf(value) : null;
    // a time that is not on a quarter (set elsewhere) stays choosable
    const times = time && !TIMES.includes(time) ? [...TIMES, time].sort() : TIMES;
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
                disabled={disabled}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className="date-time-day"
            />
            <Dropdown
                value={time}
                options={times}
                onChange={(event) => onChange(withTime(value ?? minDate ?? new Date(), event.value))}
                disabled={disabled}
                placeholder={t('Time')}
                aria-label={ariaLabel ? `${ariaLabel} · ${t('Time')}` : t('Time')}
                className="date-time-time"
                scrollHeight="16rem"
            />
        </span>
    );
};

export default DateTimeField;
