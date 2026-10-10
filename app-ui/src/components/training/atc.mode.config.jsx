import { SelectButton } from 'primereact/selectbutton';
import ATCConfigOptions from './atc.config.options';
import ATCHelp from './atc.help';

const ATCModeConfig = ({ atcModeOption, onATCModeChange }) => {
    return (
        <div className="container p-0">
            <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                <span className="text-shade500 fs-7 fw-semibold">Training Mode</span>
                <ATCHelp />
            </div>
            <div className="row border border-shade600 rounded m-0 py-3 mb-3 gx-0 px-2">
                <div className="col d-flex justify-content-center">
                    <SelectButton
                        value={atcModeOption}
                        onChange={(e) => onATCModeChange(e.value)}
                        optionLabel="value"
                        options={ATCConfigOptions.modeOptions.values}
                        aria-label="Select Training Mode"
                    />
                </div>
            </div>
        </div>
    );
};

export default ATCModeConfig;
