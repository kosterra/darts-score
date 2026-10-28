import { Button } from 'primereact/button';

import { locale, t } from '../../utils/i18n';
import { addDays, monthGrid, otherMonth } from '../../rules/calendar';

// a day "YYYY-MM-DD" at noon UTC, to name it without time zones
const noonOf = (day) => new Date(`${day}T12:00:00Z`);
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const weekdayShort = (weekday) => new Intl.DateTimeFormat(locale(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + weekday)));
const monthTitle = (month) => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(noonOf(`${month}-01`));

/**
 * The calendar as a month: a week a row, Monday first; each day with its
 * club night (cancelled ones struck through) and the days of tournaments and
 * leagues. A tap on a day shows what is on below the grid.
 * byDay: Map day → [{ key, night | event }]; eventName(event): its short name
 */
const CalendarMonth = ({ month, byDay, today, selected, onSelect, onMonth, eventName }) => {
    const { from, to } = monthGrid(month);
    const days = [];
    for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
    return (
        <div className="calendar-month-view">
            <div className="calendar-month-nav">
                <Button icon="pi pi-chevron-left" text rounded size="small" aria-label={t('Earlier month')} onClick={() => onMonth(otherMonth(month, -1))} />
                <span className="text-default fw-semibold text-capitalize">{monthTitle(month)}</span>
                <Button icon="pi pi-chevron-right" text rounded size="small" aria-label={t('Later month')} onClick={() => onMonth(otherMonth(month, 1))} />
            </div>
            <div className="calendar-grid" role="grid" aria-label={monthTitle(month)}>
                {MONDAY_FIRST.map(weekday => <span key={weekday} className="calendar-grid-weekday" role="columnheader">{weekdayShort(weekday)}</span>)}
                {days.map(day => {
                    const items = byDay.get(day) ?? [];
                    const outside = !day.startsWith(month);
                    return (
                        <button
                            key={day}
                            type="button"
                            role="gridcell"
                            aria-selected={day === selected}
                            className={`calendar-grid-day ${outside ? 'is-outside' : ''} ${day === today ? 'is-today' : ''} ${day === selected ? 'is-selected' : ''} ${day < today ? 'is-past' : ''}`}
                            onClick={() => onSelect(day)}
                        >
                            <span className="calendar-grid-number">{Number(day.slice(8))}</span>
                            <span className="calendar-grid-items">
                                {items.map(item => (item.night
                                    ? <span key={item.key} className={`calendar-grid-item is-night ${item.night.cancelled ? 'is-cancelled' : ''}`} title={`${t('Club night')} ${item.night.start}${item.night.cancelled ? ` · ${t('Cancelled')}` : ''}`}>
                                        <span className="calendar-grid-label"><i className="pi pi-users me-1" aria-hidden="true" />{item.night.start}</span>
                                    </span>
                                    : <span key={item.key} className="calendar-grid-item is-event" title={eventName(item.event)}>
                                        <span className="calendar-grid-label">{eventName(item.event)}</span>
                                    </span>))}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarMonth;
