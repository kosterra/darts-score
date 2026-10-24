import { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { t } from '../../utils/i18n';

// a chosen type: a pill with its icon and name, in the type's colour
const TypePill = ({ item }) => (
    <span className={`type-pill game-type-${item.value}`}>
        {item.icon && <item.icon aria-hidden="true" />}
        {item.label}
    </span>
);

const itemTemplate = (item) => (
    <span className="d-inline-flex align-items-center gap-2">
        {item.icon && <span className="type-filter-icon" aria-hidden="true"><item.icon /></span>}
        {item.label}
    </span>
);

/**
 * A filter by type (of game or training) for the lists: any number of types,
 * grouped, each with its icon; a click on a group's title takes the whole
 * group (or leaves it again). Nothing chosen is every type. Closed, it says
 * what is chosen: "All game types", "X01, Cricket", "More games", "5 types".
 *
 * groups: [{ label, items: [{ value, label, icon }] }]
 * value: the chosen types ([] for all); onChange(values)
 * allLabel: what nothing chosen says, e.g. "All game types"
 * single: exactly one type (e.g. the player comparison): value is that type,
 * onChange(type); the same grouped list, without taking a whole group.
 * The chosen types show as pills with their icon, in their colour.
 */
const TypeFilter = (props) => {
    // opened with the mouse or a finger: no focus ring (its search field always counts as keyboard focus)
    const [pointer, setPointer] = useState(false);
    return (
        <span className={`type-filter-wrap ${pointer ? 'is-pointer' : ''}`} onPointerDownCapture={() => setPointer(true)} onKeyDownCapture={(event) => event.key !== 'Escape' && setPointer(false)}>
            <TypeFilterField {...props} />
        </span>
    );
};

const TypeFilterField = ({ groups, value = [], onChange, allLabel, ariaLabel, single = false }) => {
    const items = groups.flatMap(group => group.items);

    if (single) {
        return (
            <Dropdown
                value={value}
                options={groups}
                optionGroupLabel="label"
                optionGroupChildren="items"
                optionLabel="label"
                optionValue="value"
                onChange={(e) => e.value && onChange(e.value)}
                optionGroupTemplate={(group) => <span className="type-filter-group is-label">{group.label}</span>}
                itemTemplate={itemTemplate}
                valueTemplate={() => {
                    const item = items.find(entry => entry.value === value);
                    return item ? <TypePill item={item} /> : <span>{allLabel}</span>;
                }}
                scrollHeight="34rem"
                className="type-filter is-narrowed is-single"
                panelClassName="type-filter-panel"
                aria-label={ariaLabel ?? allLabel}
            />
        );
    }

    const chosen = new Set(value);
    const all = items.map(item => item.value);

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
            // one or two types as pills; more, or whole groups, in words on one line
            selectedItemTemplate={(type) => {
                const whole = groups.some(group => group.items.length > 1 && group.items.every(item => chosen.has(item.value)));
                if (value.length && value.length <= 2 && !whole) {
                    const item = items.find(entry => entry.value === type);
                    return item ? <TypePill item={item} /> : null;
                }
                return type === undefined || type === value[0] ? <span>{summary()}</span> : null;
            }}
            optionGroupTemplate={(group) => {
                const allIn = group.items.every(item => chosen.has(item.value));
                return (
                    <button type="button" className="type-filter-group" onClick={(event) => { event.stopPropagation(); toggleGroup(group); }} aria-pressed={allIn}>
                        <span>{group.label}</span>
                        <span className="type-filter-group-all">{allIn ? t('none') : t('all')}</span>
                    </button>
                );
            }}
            itemTemplate={itemTemplate}
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
