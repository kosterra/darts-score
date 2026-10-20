import { InputSwitch } from 'primereact/inputswitch';

/**
 * A setting that is on or off, in the box of the game setup (as the
 * handicap): the switch, then the title with what it does below.
 */
const SettingSwitch = ({ id, title, hint, checked, onChange, disabled = false }) => (
    <div className="setting-switch">
        <InputSwitch inputId={id} checked={checked} disabled={disabled} onChange={(event) => onChange(event.value)} />
        <label htmlFor={id} className="d-flex flex-column">
            <span className="text-default fw-semibold">{title}</span>
            {hint && <span className="text-faint fs-8">{hint}</span>}
        </label>
    </div>
);

export default SettingSwitch;
