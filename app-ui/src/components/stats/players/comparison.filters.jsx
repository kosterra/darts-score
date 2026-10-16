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
 * The filters of the player comparison, shown in its header: game type,
 * period (or a custom range), the last N games, and for X01 the starting
 * score and the format. "formats" are the formats the players have played.
 */
const ComparisonFilters = ({ filters, onChange, formats }) => {
    const set = (changes) => onChange({ ...filters, ...changes });
    const isX01 = filters.type === 'x01';

    return (
        <div className="comparison-filters">
            <Filter label="Game type">
                <SelectButton value={filters.type} options={GAME_TYPES} onChange={(e) => e.value && set({ type: e.value })} aria-label="Game type" />
            </Filter>
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
            <Filter label="Last games together">
                <SelectButton value={filters.lastGames} options={LAST_GAMES} onChange={(e) => e.value && set({ lastGames: e.value })} className="p-selectbutton-pills" aria-label="Last games together" />
            </Filter>
            {isX01 && <>
                <Filter label="Starting score">
                    <Dropdown value={filters.startingScore} options={STARTING_SCORES} onChange={(e) => set({ startingScore: e.value })} aria-label="Starting score" style={{ minWidth: '9rem' }} />
                </Filter>
                <Filter label="Format">
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
            <label htmlFor="compare-include-others" className="comparison-include-others d-flex align-items-center gap-2 text-subtle fs-7">
                <InputSwitch inputId="compare-include-others" checked={filters.includeOthers} onChange={(e) => set({ includeOthers: e.value })} />
                Include games with other players too
            </label>
        </div>
    );
};

export default ComparisonFilters;
