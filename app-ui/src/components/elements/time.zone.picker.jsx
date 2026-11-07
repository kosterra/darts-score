import { useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';

import { DEFAULT_TIME_ZONE } from '../../rules/zones';
import { t } from '../../utils/i18n';

// how far a zone is from UTC now: "GMT+1"
const offsetOf = (zone) => {
    try {
        return new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value ?? '';
    } catch {
        return '';
    }
};

// the zones the browser knows, as "Europe / Zurich · GMT+1"
const zoneOptions = () => {
    const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [DEFAULT_TIME_ZONE];
    return [...new Set([...zones, DEFAULT_TIME_ZONE, 'UTC'])].sort().map(zone => ({ value: zone, label: `${zone.replaceAll('/', ' / ').replaceAll('_', ' ')} · ${offsetOf(zone)}` }));
};

/**
 * The time zone a club plays in, with a search: its days, weeks, club
 * nights and league matchdays follow it.
 */
const TimeZonePicker = ({ value, onChange, disabled = false, className = 'profile-club' }) => {
    const options = useMemo(zoneOptions, []);
    return (
        <Dropdown
            value={value || DEFAULT_TIME_ZONE}
            options={options}
            onChange={(event) => event.value && onChange(event.value)}
            filter
            disabled={disabled}
            className={className}
            aria-label={t('Time zone')}
        />
    );
};

export default TimeZonePicker;
