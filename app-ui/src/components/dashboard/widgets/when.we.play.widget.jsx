import { useMemo } from 'react';
import { Panel } from 'primereact/panel';

import { whenWePlay, TIME_SLOTS } from '../../../utils/club.charts';
import { t } from '../../../utils/i18n';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Games by day of the week and time of day: when the club plays most.
 */
const WhenWePlayWidget = ({ widget, gameLog }) => {
    const { grid, max } = useMemo(() => whenWePlay(gameLog), [gameLog]);
    // the busiest slot, said in words
    let busiest = null;
    grid.forEach((slots, day) => slots.forEach((count, slot) => {
        if (count > 0 && (!busiest || count > busiest.count)) busiest = { day, slot, count };
    }));

    return (
        <Panel header={widget.title} className="h-100">
            <p className="text-faint fs-8 mt-0 mb-3">
                {busiest ? t('Busiest: {{value}} {{toLowerCase}}.', { value: DAYS[busiest.day], toLowerCase: TIME_SLOTS[busiest.slot].label.toLowerCase() }) : t('No games yet.')}
            </p>
            <div className="when-grid">
                <span />
                {TIME_SLOTS.map(slot => <span key={slot.id} className="when-slot">{slot.label}</span>)}
                {grid.map((slots, day) => (
                    <div key={DAYS[day]} style={{ display: 'contents' }}>
                        <span className="when-day">{DAYS[day].slice(0, 3)}</span>
                        {slots.map((count, slot) => {
                            const title = `${DAYS[day]} ${TIME_SLOTS[slot].label.toLowerCase()}: ${count} ${count === 1 ? 'game' : 'games'}`;
                            return (
                                <span
                                    key={slot}
                                    className="when-cell"
                                    style={{ '--intensity': max ? count / max : 0 }}
                                    title={title}
                                    aria-label={title}
                                >
                                    {count > 0 ? count : ''}
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
        </Panel>
    );
};

export default WhenWePlayWidget;
