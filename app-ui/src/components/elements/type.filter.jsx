import { MultiSelect } from 'primereact/multiselect';
import { t } from '../../utils/i18n';

/**
 * A filter by type (of game or training) for the lists: any number of types,
 * grouped, each with its icon; a click on a group's title takes the whole
 * group (or leaves it again). Nothing chosen is every type. Closed, it says
 * what is chosen: "All game types", "X01, Cricket", "More games", "5 types".
 *
 * groups: [{ label, items: [{ value, label, icon }] }]
 * value: the chosen types ([] for all); onChange(values)
 * allLabel: what nothing chosen says, e.g. "All game types"
 */
const TypeFilter = ({ groups, value = [], onChange, allLabel, ariaLabel }) => {
    const chosen = new Set(value);
    const all = groups.flatMap(group => group.items.map(item => item.value));

    // what the closed filter says
    const summary = () => {
        if (!value.length || value.length === all.length) return allLabel;
        const whole = groups.filter(group => group.items.length > 1 && group.items.every(item => chosen.has(item.value)));
        const rest = value.filter(type => !whole.some(group => group.items.some(item => item.value === type)));
        const parts = [...whole.map(group => group.label), ...rest.map(type => groups.flatMap(group => group.items).find(item => item.value === type)?.label ?? type)];
        return parts.length <= 2 ? parts.join(', ') : t('{{count}} types', { count: value.length });
    };

    const toggleGroup = (group) => {
        const values = group.items.map(item => item.value);
        const allIn = values.every(type => chosen.has(type));
        onChange(allIn ? value.filter(type => !values.includes(type)) : [...new Set([...value, ...values])]);
    };

    return (
        <MultiSelect
            value={value}
            options={groups}
            optionGroupLabel="label"
            optionGroupChildren="items"
            optionLabel="label"
            optionValue="value"
            onChange={(e) => onChange(e.value ?? [])}
            // one line for what is chosen, not every type
            selectedItemTemplate={(type) => (type === undefined || type === value[0] ? <span>{summary()}</span> : null)}
            optionGroupTemplate={(group) => {
                const allIn = group.items.every(item => chosen.has(item.value));
                return (
                    <button type="button" className="type-filter-group" onClick={(event) => { event.stopPropagation(); toggleGroup(group); }} aria-pressed={allIn}>
                        <span>{group.label}</span>
                        <span className="type-filter-group-all">{allIn ? t('none') : t('all')}</span>
                    </button>
                );
            }}
            itemTemplate={(item) => (
                <span className="d-inline-flex align-items-center gap-2">
                    {item.icon && <span className="type-filter-icon" aria-hidden="true"><item.icon /></span>}
                    {item.label}
                </span>
            )}
            showSelectAll={false}
            // every type in view without scrolling
            scrollHeight="34rem"
            filter={all.length > 12}
            className={`type-filter ${value.length ? 'is-narrowed' : ''}`}
            panelClassName="type-filter-panel"
            aria-label={ariaLabel ?? allLabel}
        />
    );
};

export default TypeFilter;
