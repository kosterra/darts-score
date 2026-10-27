import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';

import useMediaQuery from '../../utils/use.media.query';

/**
 * The short filters of the lists as pills, the same everywhere: one choice
 * of a few, each with an icon where it helps.
 * options: [{ label, value, icon (a PrimeIcons class, e.g. 'pi pi-play') }];
 * dropdownOnPhone: a dropdown on a phone instead (for a choice of several)
 */
const FilterPills = ({ value, options, onChange, ariaLabel, className = '', disabled = false, dropdownOnPhone = false }) => {
    // on a phone a choice of several (e.g. the status of games) is a dropdown, as the other filters there
    const phone = useMediaQuery('(max-width: 575.98px)');
    if (dropdownOnPhone && phone) {
        return (
            <Dropdown
                value={value}
                options={options}
                onChange={(e) => e.value != null && onChange(e.value)}
                disabled={disabled}
                itemTemplate={(option) => <span className="d-inline-flex align-items-center gap-2">{option.icon && <i className={option.icon} aria-hidden="true" />}{option.label}</span>}
                className={`filter-dropdown ${className}`}
                aria-label={ariaLabel}
            />
        );
    }
    return (
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
};

export default FilterPills;
