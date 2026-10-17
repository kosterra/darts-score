import { useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';

const GAME_TYPES = [
    { label: 'X01', value: 'x01' },
    { label: 'Cricket', value: 'cricket' },
    { label: 'Elimination', value: 'elimination' },
];
const PERIODS = ['1 D', '1 W', '1 M', '1 Y', 'All', 'Custom'].map(value => ({ label: value === 'Custom' ? 'Dates' : value, value }));
const LAST_GAMES = [5, 10, 20, 'All'].map(value => ({ label: String(value), value }));
const STARTING_SCORES = [
    { label: 'Any score', value: 'All' },
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
                <span className="filter-panel-summary" aria-label="Filters in use">
                    {summary.map(part => <span key={part} className="filter-chip">{part}</span>)}
                </span>
                <Button
                    type="button"
                    icon={changed ? 'pi pi-filter-fill' : 'pi pi-filter'}
                    label="Filters"
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
    { label: 'This club', value: 'club' },
    { label: 'All clubs', value: 'all' },
];

/**
 * The filters of the player comparison and a player's profile, shown in their
 * header: game type, period (or a custom range), the last N games, and for X01
 * the starting score and the format. "formats" are the formats played.
 * The profile leaves out the game type and "other players" (withType,
 * withOthers false) and adds the clubs (withScope); "scopeHint" disables the
 * clubs and says why, e.g. for a player of only one club.
 */
const ComparisonFilters = ({ filters, onChange, formats, withType = true, withOthers = true, withScope = false, scopeHint = null, lastGamesLabel = 'Last games together' }) => {
    const set = (changes) => onChange({ ...filters, ...changes });
    // without a game type every type is shown, X01 included
    const isX01 = !withType || filters.type === 'x01';

    return (
        <div className="comparison-filters">
            {withScope &&
                <Filter label="Clubs">
                    <span title={scopeHint ?? undefined}>
                        <SelectButton value={filters.scope} options={SCOPES} onChange={(e) => e.value && set({ scope: e.value })} disabled={Boolean(scopeHint)} aria-label="Clubs" />
                    </span>
                </Filter>
            }
            {withType &&
                <Filter label="Game type">
                    <SelectButton value={filters.type} options={GAME_TYPES} onChange={(e) => e.value && set({ type: e.value })} aria-label="Game type" />
                </Filter>
            }
            <Filter label="Period">
                <div className="d-flex flex-wrap align-items-center gap-2">
                    <SelectButton value={filters.period} options={PERIODS} onChange={(e) => e.value && set({ period: e.value })} className="p-selectbutton-pills" aria-label="Period" />
                    {filters.period === 'Custom' &&
                        <Calendar
                            value={filters.range}
                            onChange={(e) => set({ range: e.value })}
                            selectionMode="range"
                            readOnlyInput
                            dateFormat="dd.mm.yy"
                            placeholder="Choose dates"
                            maxDate={new Date()}
                            showButtonBar
                            aria-label="From and to"
                            style={{ width: '14rem' }}
                        />
                    }
                </div>
            </Filter>
            <Filter label={lastGamesLabel}>
                <SelectButton value={filters.lastGames} options={LAST_GAMES} onChange={(e) => e.value && set({ lastGames: e.value })} className="p-selectbutton-pills" aria-label={lastGamesLabel} />
            </Filter>
            {isX01 && <>
                <Filter label={withType ? 'Starting score' : 'X01 starting score'}>
                    <Dropdown value={filters.startingScore} options={STARTING_SCORES} onChange={(e) => set({ startingScore: e.value })} aria-label="Starting score" style={{ minWidth: '9rem' }} />
                </Filter>
                <Filter label={withType ? 'Format' : 'X01 format'}>
                    <Dropdown
                        value={filters.format}
                        options={[{ label: 'Any format', value: 'all' }, ...formats]}
                        onChange={(e) => set({ format: e.value })}
                        aria-label="Format"
                        style={{ minWidth: '14rem' }}
                        emptyMessage="No games yet"
                    />
                </Filter>
            </>}
            {withOthers &&
                <label htmlFor="compare-include-others" className="comparison-include-others d-flex align-items-center gap-2 text-subtle fs-7">
                    <InputSwitch inputId="compare-include-others" checked={filters.includeOthers} onChange={(e) => set({ includeOthers: e.value })} />
                    Include games with other players too
                </label>
            }
        </div>
    );
};

export default ComparisonFilters;
