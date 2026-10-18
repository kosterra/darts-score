import { SelectButton } from 'primereact/selectbutton';
import ATCConfigOptions from './atc.config.options';
import ATCHelp from './atc.help';

const ATCModeConfig = ({ atcModeOption, onATCModeChange, disabled = false }) => {
    const options = ATCConfigOptions.modeOptions.values;
    return (
        <div className="setting-box d-flex flex-column align-items-center gap-2">
            <p className="setting-title align-self-stretch">Mode</p>
            <SelectButton
                value={atcModeOption}
                onChange={(e) => e.value && onATCModeChange(e.value)}
                optionLabel="value"
                options={options}
                disabled={disabled}
                className="p-selectbutton-pills flex-wrap justify-content-center"
                aria-label="Training mode"
            />
            <span className="text-faint fs-8 text-center">
                {options.find(option => option.value === atcModeOption)?.description}
                <ATCHelp />
            </span>
        </div>
    );
};

export default ATCModeConfig;
