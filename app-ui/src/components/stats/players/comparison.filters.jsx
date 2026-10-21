import { useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';
import { t } from '../../../utils/i18n';

const GAME_TYPES = [
    { label: t('X01'), value: 'x01' },
    { label: t('Cricket'), value: 'cricket' },
    { label: t('Elimination'), value: 'elimination' },
];
const PERIODS = ['1 D', '1 W', '1 M', '1 Y', 'All', 'Custom'].map(value => ({ label: value === 'Custom' ? t('Dates') : value === 'All' ? t('All') : value, value }));
const LAST_GAMES = [5, 10, 20, 'All'].map(value => ({ label: value === 'All' ? t('All') : String(value), value }));
const STARTING_SCORES = [
    { label: t('Any score'), value: 'All' },
    ...[101, 301, 501, 701, 1001].map(value => ({ label: String(value), value })),
];

const Filter = ({ label, children }) => (
    <div className="d-flex flex-column gap-1">
        <span className="text-faint fs-8">{label}</span>
        {children}
    </div>
);

/**
 * Filters that open from a button. Closed, a bar shows what they are set to;
 * the button counts the filters changed from their defaults.
 */
export const FilterPanel = ({ summary, changed, children }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="filter-panel">
            <div className="filter-panel-bar">
                <span className="filter-panel-summary" aria-label={t('Filters in use')}>
                    {summary.map(part => <span key={part} className="filter-chip">{part}</span>)}
                </span>
                <Button
                    type="button"
                    icon={changed ? 'pi pi-filter-fill' : 'pi pi-filter'}
                    label={t('Filters')}
                    badge={changed ? String(changed) : undefined}
                    severity="secondary"
                    size="small"
                    className={`filter-panel-toggle ${open ? 'is-open' : ''}`}
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                />
            </div>
            {open &&
                <>
                    <div className="comparison-filters-divider" />
                    {children}
                </>
            }
        </div>
    );
};

const SCOPES = [
    { label: t('This club'), value: 'club' },
    { label: t('All clubs'), value: 'all' },
];

/**
 * The filters of the player comparison and a player's profile, shown in their
 * header: game type, period (or a custom range), the last N games, and for X01
 * the starting score and the format. "formats" are the formats played.
 * The profile leaves out the game type and "other players" (withType,
 * withOthers false) and adds the clubs (withScope); "scopeHint" disables the
 * clubs and says why, e.g. for a player of only one club.
 */
const ComparisonFilters = ({ filters, onChange, formats, withType = true, withOthers = true, withScope = false, scopeHint = null, lastGamesLabel = t('Last games together') }) => {
    const set = (changes) => onChange({ ...filters, ...changes });
    // without a game type every type is shown, X01 included
    const isX01 = !withType || filters.type === 'x01';

    return (
        <div className="comparison-filters">
            {withScope &&
                <Filter label={t('Clubs')}>
                    <span title={scopeHint ?? undefined}>
                        <SelectButton value={filters.scope} options={SCOPES} onChange={(e) => e.value && set({ scope: e.value })} disabled={Boolean(scopeHint)} aria-label={t('Clubs')} />
                    </span>
                </Filter>
            }
            {withType &&
                <Filter label={t('Game type')}>
                    <SelectButton value={filters.type} options={GAME_TYPES} onChange={(e) => e.value && set({ type: e.value })} aria-label={t('Game type')} />
                </Filter>
            }
            <Filter label={t('Period')}>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    <SelectButton value={filters.period} options={PERIODS} onChange={(e) => e.value && set({ period: e.value })} className="p-selectbutton-pills" aria-label={t('Period')} />
                    {filters.period === 'Custom' &&
                        <Calendar
                            value={filters.range}
                            onChange={(e) => set({ range: e.value })}
                            selectionMode="range"
                            readOnlyInput
                            dateFormat="dd.mm.yy"
                            placeholder={t('Choose dates')}
                            maxDate={new Date()}
                            showButtonBar
                            aria-label={t('From and to')}
                            style={{ width: '14rem' }}
                        />
                    }
                </div>
            </Filter>
            <Filter label={lastGamesLabel}>
                <SelectButton value={filters.lastGames} options={LAST_GAMES} onChange={(e) => e.value && set({ lastGames: e.value })} className="p-selectbutton-pills" aria-label={lastGamesLabel} />
            </Filter>
            {isX01 && <>
                <Filter label={withType ? t('Starting score') : t('X01 starting score')}>
                    <Dropdown value={filters.startingScore} options={STARTING_SCORES} onChange={(e) => set({ startingScore: e.value })} aria-label={t('Starting score')} style={{ minWidth: '9rem' }} />
                </Filter>
                <Filter label={withType ? t('Format') : t('X01 format')}>
                    <Dropdown
                        value={filters.format}
                        options={[{ label: t('Any format'), value: 'all' }, ...formats]}
                        onChange={(e) => set({ format: e.value })}
                        aria-label={t('Format')}
                        style={{ minWidth: '14rem' }}
                        emptyMessage={t('No games yet')}
                    />
                </Filter>
            </>}
            {withOthers &&
                <label htmlFor="compare-include-others" className="comparison-include-others d-flex align-items-center gap-2 text-subtle fs-7">
                    <InputSwitch inputId="compare-include-others" checked={filters.includeOthers} onChange={(e) => set({ includeOthers: e.value })} />
                    {t('Include games with other players too')}
                </label>
            }
        </div>
    );
};

export default ComparisonFilters;
