import { SelectButton } from 'primereact/selectbutton';

/**
 * The short filters of the lists as pills, the same everywhere: one choice
 * of a few, each with an icon where it helps.
 * options: [{ label, value, icon (a PrimeIcons class, e.g. 'pi pi-play') }]
 */
const FilterPills = ({ value, options, onChange, ariaLabel, className = '', disabled = false }) => (
    <SelectButton
        value={value}
        options={options}
        onChange={(e) => e.value != null && onChange(e.value)}
        disabled={disabled}
        itemTemplate={(option) => (
            // the label of a pill, as PrimeReact draws it (the size of every pill)
            <span className="p-button-label d-inline-flex align-items-center gap-2">
                {option.icon && <i className={`${option.icon} filter-pill-icon`} aria-hidden="true" />}
                {option.label}
            </span>
        )}
        className={`p-selectbutton-pills pills-inline filter-pills ${className}`}
        aria-label={ariaLabel}
    />
);

export default FilterPills;
