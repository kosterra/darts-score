import { Dropdown } from 'primereact/dropdown';

import SetsLegsConfigOptions from '../config_options/sets.legs.config.options';

const SetsLegsConfig = (props) => {
    const {
        onSetsLegsChange,
        setModeOption,
        legModeOption,
        numberOfSetsOption,
        numberOfLegsOption
    } = props

    const {
        setLegModeOptions,
        ftLegsNumberOptions,
        boLegsNumberOptions,
        ftSetsNumberOptions,
        boSetsNumberOptions
    } = SetsLegsConfigOptions;

    return (
        <div className="container">
            <div className="row">
                <div className="col-12 col-xl-6">
                    <p className="text-center text-shade500 fs-7 fw-semibold">Sets</p>
                    <div className="row gap-1 border border-shade600 rounded m-0 py-3 mb-3">
                        <div className="col">
                            <Dropdown
                                value={setModeOption}
                                onChange={(e) => onSetsLegsChange('setMode', e.value)}
                                options={setLegModeOptions.values}
                                optionLabel="value"
                                placeholder="Set Mode"
                                className="w-100"
                            />
                        </div>
                        <div className="col">
                            <Dropdown
                                value={numberOfSetsOption}
                                onChange={(e) => onSetsLegsChange('numberOfSets', e.value)}
                                options={setModeOption === 'First to' ? ftSetsNumberOptions.values : boSetsNumberOptions.values}
                                optionLabel="name"
                                placeholder="Number of Sets"
                                className="w-100"
                            />
                        </div>
                    </div>
                </div>
                <div className="col-12 col-xl-6">
                    <p className="text-center text-shade500 fs-7 fw-semibold">Legs</p>
                    <div className="row gap-1 border border-shade600 rounded m-0 py-3 mb-3">
                        <div className="col">
                            <Dropdown
                                value={legModeOption}
                                onChange={(e) => onSetsLegsChange('legMode', e.value)}
                                options={setLegModeOptions.values}
                                optionLabel="value"
                                placeholder="Leg Mode"
                                className="w-100"
                            />
                        </div>
                        <div className="col">
                            <Dropdown
                                value={numberOfLegsOption}
                                onChange={(e) => onSetsLegsChange('numberOfLegs', e.value)}
                                options={legModeOption === 'First to' ? ftLegsNumberOptions.values : boLegsNumberOptions.values}
                                optionLabel="name"
                                placeholder="Number of Legs"
                                className="w-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetsLegsConfig;