import { useMemo } from 'react';
import { Panel } from 'primereact/panel';
import dayjs from 'dayjs';

import { activityCalendar } from '../../../utils/club.charts';

const LEVELS = 4;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

// 0 for no games, then 1–4 by share of the busiest day
const levelOf = (count, max) => count === 0 ? 0 : Math.max(1, Math.ceil(count / max * LEVELS));

/**
 * The last six months as a grid of days, greener the more games were played.
 */
const ActivityCalendarWidget = ({ widget, gameLog }) => {
    const calendar = useMemo(() => activityCalendar(gameLog), [gameLog]);
    // a month label above the first week of each month; a month cut off at the
    // left edge gets none, so labels never crowd each other
    const monthOf = (column) => dayjs(column.start).add(6, 'day').format('MMM');
    const monthLabels = calendar.columns.map((column, index) => {
        if (index === 0) return calendar.columns.length > 2 && monthOf(calendar.columns[2]) !== monthOf(column) ? '' : monthOf(column);
        return monthOf(column) !== monthOf(calendar.columns[index - 1]) ? monthOf(column) : '';
    });
    const activeDays = calendar.columns.flatMap(column => column.days).filter(day => day?.count > 0).length;

    return (
        <Panel header={widget.title} className="h-100">
            <p className="text-faint fs-8 mt-0 mb-3">
                {calendar.total} games on {activeDays} days in the last six months.
            </p>
            <div className="activity-calendar" style={{ '--weeks': calendar.columns.length }}>
                <span />
                {monthLabels.map((label, index) => <span key={`m-${index}`} className="activity-month">{label}</span>)}
                {DAY_LABELS.map((dayLabel, day) => (
                    <div key={`row-${day}`} style={{ display: 'contents' }}>
                        <span className="activity-weekday">{dayLabel}</span>
                        {calendar.columns.map(column => {
                            const entry = column.days[day];
                            if (!entry) return <span key={`${column.start}-${day}`} />;
                            const title = `${dayjs(entry.date).format('ddd DD.MM.YYYY')}: ${entry.count} ${entry.count === 1 ? 'game' : 'games'}`;
                            return <span key={entry.date} className={`activity-day level-${levelOf(entry.count, calendar.max)}`} title={title} aria-label={title} />;
                        })}
                    </div>
                ))}
            </div>
            <div className="d-flex justify-content-end align-items-center gap-1 mt-2 text-faint fs-9">
                <span className="me-1">Less</span>
                {Array.from({ length: LEVELS + 1 }, (_, level) => <span key={level} className={`activity-day level-${level}`} aria-hidden="true" />)}
                <span className="ms-1">More</span>
            </div>
        </Panel>
    );
};

export default ActivityCalendarWidget;
